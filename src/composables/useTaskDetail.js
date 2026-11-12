import { ref } from 'vue'

/** Which task the detail panel shows (null = closed). Shared by all views. */
const taskId = ref(null)

export function useTaskDetail() {
  return {
    taskId,
    openTask: (task) => { taskId.value = task.id ?? task._id },
    closeTask: () => { taskId.value = null },
  }
}
