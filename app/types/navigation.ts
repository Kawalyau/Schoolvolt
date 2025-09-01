// types/navigation.ts
export type RootStackParamList = {
    Login: undefined;
    Signup: undefined;
    SchoolAuth: undefined;
    CreateSchool: undefined;
    SchoolDashboard: { schoolId: string };
    ForgotPassword: undefined;
    AdminLogin: undefined;
  };
  
  // Declare global types for navigation
  declare global {
    namespace ReactNavigation {
      interface RootParamList extends RootStackParamList {}
    }
  }
