export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log(
            "SW registrado con éxito en el alcance:",
            registration.scope,
          );
        })
        .catch((error) => {
          console.error("Fallo el registro del SW:", error);
        });
    });
  }
}
