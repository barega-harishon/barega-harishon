export interface ActionResult<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ContactMessage {
  fullName: string;
  email: string;
  message: string;
}
