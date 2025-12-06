import api from './api';

const QUEUE_KEY = 'offline_action_queue';

export const OfflineQueue = {
  getQueue: () => {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  },

  addToQueue: (action) => {
    const queue = OfflineQueue.getQueue();
    const newAction = {
      ...action,
      tempId: Date.now().toString(), // Simple temp ID
      timestamp: Date.now()
    };
    queue.push(newAction);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newAction.tempId;
  },

  clearQueue: () => {
    localStorage.removeItem(QUEUE_KEY);
  },

  removeFromQueue: (tempIds) => {
    let queue = OfflineQueue.getQueue();
    queue = queue.filter(item => !tempIds.includes(item.tempId));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  sync: async () => {
    const queue = OfflineQueue.getQueue();
    if (queue.length === 0) return { success: true, count: 0 };

    try {
      const res = await api.post('/reception/sync', { actions: queue });
      const { results } = res.data;
      
      // Filter out successfully synced items
      const successfulIds = results
        .filter(r => r.status === 'SUCCESS')
        .map(r => r.tempId);
      
      OfflineQueue.removeFromQueue(successfulIds);
      
      return { 
        success: true, 
        count: successfulIds.length, 
        errors: results.filter(r => r.status === 'ERROR') 
      };
    } catch (error) {
      console.error("Sync failed", error);
      return { success: false, error };
    }
  }
};
