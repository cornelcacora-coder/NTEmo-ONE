class FirebaseConfig {
  static const String projectId = 'ntemo-one';
  static const String projectNumber = '371281892741';
  static const String storageBucket = 'ntemo-one.firebasestorage.app';

  // Clés API Firebase
  static const String webApiKey = 'AIzaSyCIn6xn18DgFvgxbHKhCplzl45DzKaQ1Zc';
  static const String androidApiKey = 'AIzaSyCI3gP_fd_FzXePgbEVyRSowfPugq3P8Nk';
  static const String apiKey = androidApiKey;

  // Identifiants d'applications
  static const String webAppId = '1:371281892741:web:bfa8647b5dbf5a7adb60ec';
  static const String androidAppId = '1:371281892741:android:6beebdd7c7d5cf3ddb60ec';
  static const String appId = androidAppId;
  static const String packageName = 'com.ntemoconsulting.netmoONe';

  // Endpoint Firestore REST natif
  static const String firestoreBaseUrl =
      'https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents';

  // Endpoint Cloud Functions REST
  static const String functionsBaseUrl =
      'https://us-central1-$projectId.cloudfunctions.net/api';
}
