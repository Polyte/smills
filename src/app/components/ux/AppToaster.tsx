import { Toaster } from "sonner";

/** Global toast host — no next-themes dependency (Vite app). */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      theme="light"
      toastOptions={{
        classNames: {
          toast: "font-sans shadow-lg border border-border/80",
          title: "font-semibold",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
