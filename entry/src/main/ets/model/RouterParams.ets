export class RouterParams {
  id: string = '';
  activityId: string = '';
  contentId: string = '';
  bookingId: string = '';
  message: string = '';
  status: string = '';

  static fromRecord(data: Record<string, Object>): RouterParams {
    const p: RouterParams = new RouterParams();
    const idVal: Object | undefined = data['id'];
    if (idVal !== null && idVal !== undefined) {
      p.id = String(idVal);
    }
    const activityIdVal: Object | undefined = data['activityId'];
    if (activityIdVal !== null && activityIdVal !== undefined) {
      p.activityId = String(activityIdVal);
    }
    const contentIdVal: Object | undefined = data['contentId'];
    if (contentIdVal !== null && contentIdVal !== undefined) {
      p.contentId = String(contentIdVal);
    }
    const bookingIdVal: Object | undefined = data['bookingId'];
    if (bookingIdVal !== null && bookingIdVal !== undefined) {
      p.bookingId = String(bookingIdVal);
    }
    const messageVal: Object | undefined = data['message'];
    if (messageVal !== null && messageVal !== undefined) {
      p.message = String(messageVal);
    }
    const statusVal: Object | undefined = data['status'];
    if (statusVal !== null && statusVal !== undefined) {
      p.status = String(statusVal);
    }
    return p;
  }
}
