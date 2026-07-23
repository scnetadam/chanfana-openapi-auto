export class RouterParams {
  id: string = '';
  activityId: string = '';
  contentId: string = '';
  bookingId: string = '';
  taskId: string = '';
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
    const taskIdVal: Object | undefined = data['taskId'];
    if (taskIdVal !== null && taskIdVal !== undefined) {
      p.taskId = String(taskIdVal);
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
