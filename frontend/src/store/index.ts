import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import componentsReducer from './slices/componentsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    components: componentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 