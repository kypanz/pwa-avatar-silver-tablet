const host = import.meta.env.VITE_APP_BACKEND;  /* "https://cognitus.consistentlabs.dev:3000";*/

export const endpoints = {

  // Auth
  register: host + '/users/register',
  login: host + '/users/login',
  check_session: host + '/users/check-session',
  changePassword: host + '/users/change-password',
  reportIssue: host + '/report/issue',
  activate_account: host + '/users/activate-account',

  // Chatbot
  question: host + '/avatar/tablet-question',
  checkThread: host + '/avatar/tablet-check-thread-status',
  getThreadMessages: host + '/avatar/tablet-get-thread-messages',
  createThread: host + '/avatar/tablet-create-thread',
  getChatsSave: host + '/avatar/tablet-get-all-threads',
  getTelegramMessages: host + '/avatar/get-telegram-messages',

  // Avatar
  avatarNewSession: host + '/chatbot/avatar-new-session',
  avatarHandleICE: host + '/chatbot/avatar-handle-ice',
  avatarStartSession: host + '/chatbot/avatar-start-session',
  avatarStopSession: host + '/chatbot/avatar-stop-session',
  avatarRepeat: host + '/chatbot/avatar-repeat',

  // STT 
  getSttToken: host + '/stt/token',
  uploadTranscription: host + '/stt/transcription',

  // Avatar 
  getAvatarToken: host + '/avatar/get-access-token',
  createAssistant: host + '/avatar/create',
  deleteAssitant: host + '/avatar/delete',
  getAvatarList: host + '/avatar/list',
  createAudio: host + '/amazon/avatar-speak',

  // Avatar files 
  attachAvatarFile: host + '/avatar/attach-file',
  deleteAvatarfile: host + '/avatar/delete-attached-file',
  deleteBaseKowledge: host + '/avatar/delete-base-knowledge',
  getDocumentsList: host + '/avatar/documents-list',

  // Gmail 
  setGmailToken: host + '/gmail/set-token',

  // Videos and audio
  uploadVideoKnowledge: host + '/voices/knowledge-upload',
  getVideoKnowledge: host + '/videos-and-audios/list',
  updateVideoKnowledge: host + '/videos-and-audios/update',
  deleteVideoKnowledge: host + '/videos-and-audios/delete',

  //Device
  getDeviceList: host + '',
  getDeviceConfigurations: host + '/devices/get-configuration',

  // Schedule Task | Tablet
  getDeviceScheduleTask: host + '/devices/list-device-schedule-task',
  deleteDeviceScheduleTask: host + '/devices/delete-device-schedule-task',

  // Voices
  uploadVoice: host + '/voices/upload',

}


