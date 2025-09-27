// src/app.d.ts
declare global {
	namespace App {
		interface Error { }
		interface Locals {
			user?: {
				id: number;
				email: string;
				name: string;
				created_at: string;
				email_verified: boolean;
				is_active: boolean;
			};
		}
		interface PageData {
			user?: {
				id: number;
				email: string;
				name: string;
				created_at: string;
				email_verified: boolean;
				is_active: boolean;
			};
		}
		interface PageState { }
		interface Platform { }
	}
}

export { };