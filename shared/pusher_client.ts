import pusher from "pusher";

export interface Message {
  text: string;
  notificationId: string;
  channel: string;
  event: string;
}

export class PusherClient {
  pusher: any;

  constructor() {
    this.pusher = new pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_APP_KEY,
      secret: process.env.PUSHER_APP_SECRET,
      cluster: process.env.PUSHER_APP_CLUSTER,
    });
  }

  async sendNotification(message: Message) {
    await this.pusher.trigger(message.channel, message.event, {
      message: message.text,
      notificationId: message.notificationId,
    });
  }

  async sendUserNotification(
    userId: string,
    text: string = "You have a new notification.",
    notificationId: string,
  ) {
    if (!userId) {
      throw new Error("Invalid user ID");
    }

    console.log("Sending notification to user", userId);
    const message: Message = {
      notificationId: notificationId,
      text,
      channel: `user-${userId}`,
      event: "notification",
    };
    await this.sendNotification(message);
  }
}
