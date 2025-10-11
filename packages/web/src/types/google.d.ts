/**
 * Type declarations for Google APIs
 *
 * Provides TypeScript types for:
 * - Google Identity Services (GIS)
 * - Google API Client Library (gapi)
 * - Google Picker API
 */

declare global {
  interface Window {
    gapi: {
      load: (api: string, options: { callback: () => void; onerror?: () => void }) => void;
      client: {
        init: (config: { discoveryDocs: string[] }) => Promise<void>;
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
          revoke: (accessToken: string) => void;
        };
      };
      picker: {
        PickerBuilder: new () => PickerBuilder;
        ViewId: {
          FOLDERS: string;
          DOCS: string;
        };
        Feature: {
          MULTISELECT_ENABLED: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
        DocsView: new (viewId?: string) => DocsView;
      };
    };
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    error?: string;
  }

  interface TokenClient {
    callback: (response: TokenResponse) => void;
    requestAccessToken: (options?: { prompt?: string }) => void;
  }

  interface PickerBuilder {
    addView(view: DocsView): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setCallback(callback: (data: any) => void): PickerBuilder;
    enableFeature(feature: string): PickerBuilder;
    build(): Picker;
  }

  interface DocsView {
    setIncludeFolders(include: boolean): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
    setMimeTypes(types: string): DocsView;
  }

  interface Picker {
    setVisible(visible: boolean): void;
  }
}

export {};
