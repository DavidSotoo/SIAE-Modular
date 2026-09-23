// Tipos mínimos para Google Identity Services (cargado vía <script> en index.html,
// no es un paquete npm). Solo cubre lo que usamos: login con ID Token.
interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: { credential: string }) => void;
}

interface GoogleAccountsId {
  initialize(config: GoogleIdConfiguration): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  prompt(): void;
}

interface Window {
  google?: {
    accounts: {
      id: GoogleAccountsId;
    };
  };
}
