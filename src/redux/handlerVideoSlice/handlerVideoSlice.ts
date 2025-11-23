import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IVideoGenerated {
  url: string | null;
  interaction_status: boolean;
  is_error?: boolean;
  live_session_id?: string | null | undefined;
}

export interface ILiveSession {
  session_id: string;
}

const initialState: IVideoGenerated = {
  url: null,
  interaction_status: false,
  live_session_id: null,
};

const videoHandlerSlice = createSlice({
  name: 'video-backend',
  initialState,
  reducers: {
    setVideo(state, action: PayloadAction<IVideoGenerated>) {
      const { url } = action.payload;
      state.url = url;
    },
    setInteraction(state, action: PayloadAction<IVideoGenerated>) {
      const { interaction_status } = action.payload;
      state.interaction_status = interaction_status;
    },
    setChatbotLiveSessionId(state, action: PayloadAction<ILiveSession>) { // TODO : Temporal
      const { session_id } = action.payload;
      if (!session_id) return console.log('no es posible guardar la session_id que no existe => ', session_id);
      state.live_session_id = session_id;
      localStorage.setItem('chatbot_last_session_id', session_id);
    }
  },
});

export const { setVideo, setInteraction, setChatbotLiveSessionId } = videoHandlerSlice.actions;
export default videoHandlerSlice.reducer;

