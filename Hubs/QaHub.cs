using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace LMS.Hubs
{
    public class QaHub : Hub
    {
        // Join a lesson group
        public Task JoinLessonGroup(string lessonGroup)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, lessonGroup);
        }

        public Task LeaveLessonGroup(string lessonGroup)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, lessonGroup);
        }
    }
}
