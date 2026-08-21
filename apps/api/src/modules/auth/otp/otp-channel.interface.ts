export interface OtpChannelSender {
  send(contact: string, code: string): Promise<void>;
}
