import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Component {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url: string;
}

interface ComponentsState {
  components: Component[];
  loading: boolean;
  error: string | null;
}

const initialState: ComponentsState = {
  components: [],
  loading: false,
  error: null,
};

export const fetchComponents = createAsyncThunk('components/fetchComponents', async () => {
  const response = await api.get('/components/');
  return response.data;
});

const componentsSlice = createSlice({
  name: 'components',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchComponents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComponents.fulfilled, (state, action) => {
        state.loading = false;
        state.components = action.payload;
      })
      .addCase(fetchComponents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch components';
      });
  },
});

export default componentsSlice.reducer; 