import { api } from "./api";

let getToken = null;

export const setAuth0TokenGetter = (fn) => {
  getToken = fn;
};

api.interceptors.request.use(
  async (config) => {
    if (getToken) {
      const token = await getToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);