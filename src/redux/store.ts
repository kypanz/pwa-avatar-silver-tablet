import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
// import authSlice from './authSlice/authSlice';
// import snackbarSlice from './snackbarSlice/snackbarSlice';
import handlerVideoSlice from './handlerVideoSlice/handlerVideoSlice';

export const store = configureStore({
  reducer: {
    // auth: authSlice,
    // snackbar: snackbarSlice,
    handler_video: handlerVideoSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
export type AppDispatch = typeof store.dispatch;


