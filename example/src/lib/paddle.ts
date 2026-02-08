export type CheckoutCompleteData = {
  transactionId: string;
  status: string;
};

type PaddleEventCallback = (event: {
  name: string;
  data?: {
    transaction_id?: string;
    status?: string;
  };
}) => void;

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: "sandbox" | "production") => void;
      };
      Initialize: (options: {
        token: string;
        eventCallback?: PaddleEventCallback;
      }) => void;
      Checkout: {
        open: (options: {
          transactionId: string;
          settings?: {
            displayMode?: "inline" | "overlay";
            frameTarget?: string;
            frameInitialHeight?: number;
            frameStyle?: string;
            successUrl?: string;
            theme?: "light" | "dark";
          };
        }) => void;
        close: () => void;
      };
    };
  }
}

let paddleInitialized = false;
let onCheckoutComplete: ((data: CheckoutCompleteData) => void) | null = null;

export function setOnCheckoutComplete(
  cb: ((data: CheckoutCompleteData) => void) | null,
) {
  onCheckoutComplete = cb;
}

function loadPaddleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paddle.js"));
    document.head.appendChild(script);
  });
}

async function ensurePaddleLoaded(maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (window.Paddle) return true;
    try {
      await loadPaddleScript();
      if (window.Paddle) return true;
    } catch {
      console.error(
        `Paddle.js load attempt ${attempt}/${maxRetries} failed`,
      );
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return false;
}

export async function initPaddle() {
  if (paddleInitialized) return;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) {
    console.warn("VITE_PADDLE_CLIENT_TOKEN not set – Paddle.js disabled");
    return;
  }
  if (!window.Paddle) {
    const loaded = await ensurePaddleLoaded();
    if (!loaded) {
      console.error(
        "Paddle.js could not be loaded after retries. " +
        `Token present: ${!!token}, Environment: ${import.meta.env.VITE_PADDLE_SANDBOX === "true" ? "sandbox" : "production"}`,
      );
      return;
    }
  }
  if (import.meta.env.VITE_PADDLE_SANDBOX === "true") {
    window.Paddle!.Environment.set("sandbox");
  }
  window.Paddle!.Initialize({
    token,
    eventCallback: (event) => {
      if (event.name === "checkout.completed") {
        // Close the Paddle overlay
        window.Paddle?.Checkout.close();
        // Only fire the callback when a valid transaction ID is present
        const transactionId = event.data?.transaction_id;
        if (transactionId) {
          onCheckoutComplete?.({
            transactionId,
            status: event.data?.status ?? "completed",
          });
        } else {
          console.error(
            "checkout.completed event missing transaction_id",
            event.data,
          );
        }
      }
    },
  });
  paddleInitialized = true;
}
