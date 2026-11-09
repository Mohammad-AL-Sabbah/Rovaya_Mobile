/** كل مسارات الـ Backend في مكان واحد (تُضاف إلى API_URL) */
export const Endpoints = {
  auth: {
    login: '/auth/account/login',
    register: '/auth/account/register',
    sendCode: '/auth/Account/SendCode',
    resetPassword: '/auth/Account/ResetPassword',
  },
 
 guide: {
    categories: '/Customer/get-all-tourism-categories',
    cities: '/Customer/get-all-cities',
    cityDetails: (id: number) => `/Customer/get-city-details/${id}`,
  },




  recommendations: {
    all: '/Customer/recommendations',
    byId: (id: number) => `/Customer/recommendations/${id}`,
    bySeason: (season: string) => `/Customer/recommendations/season/${season}`,
    byActivity: (activity: string) => `/Customer/recommendations/activity/${activity}`,
  },

profile: {
  get: '/auth/account/profile',
  update: '/auth/account/profile/basic',
  uploadImage: '/auth/account/upload-profile-image',  // ✅ هذا هو الصحيح
  medical: '/auth/account/profile/medical',
  emergencyNumbers: '/auth/account/profile/emergency-numbers',
  additionalPhones: '/auth/account/profile/additional-phones',
},


  trips: {
    create: '/Customer/trips',
    list: '/Customer/trips/my-trips',
    archive: '/Customer/trips/archived',
  },




  news: {
    /** GET /Customer/tourism-news/latest?count=10 */
    latest: '/Customer/tourism-news/latest',
  },

} as const;