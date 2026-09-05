declare module "react-google-recaptcha-v2" {
  import type { Component } from "react";

  export interface ReCAPTCHAProps {
    sitekey: string;
    onChange?: (token: string | null) => void;
    onExpired?: () => void;
    onError?: () => void;
    theme?: "light" | "dark";
    size?: "normal" | "compact" | "invisible";
    tabindex?: number;
    asyncScriptOnLoad?: () => void;
    hl?: string;
    ref?: React.Ref<any>;
  }

  export default class ReCAPTCHA extends Component<ReCAPTCHAProps> {
    reset(): void;
    execute(): void;
    executeAsync(): Promise<string>;
    getValue(): string | null;
  }
}
