import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

class UserProfile {
  final String id;
  final String displayName;
  final String email;
  final String? photoUrl;
  final String? accessToken;

  UserProfile({
    required this.id,
    required this.displayName,
    required this.email,
    this.photoUrl,
    this.accessToken,
  });
}
class AuthService with ChangeNotifier {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
    ],
  );

  GoogleSignInAccount? _currentUser;
  UserProfile? _userProfile;
  bool _isSigningIn = false;

  GoogleSignInAccount? get currentUser => _currentUser;
  UserProfile? get userProfile => _userProfile;
  bool get isSigningIn => _isSigningIn;
  bool get isAuthenticated => _userProfile != null;

  AuthService() {
    _googleSignIn.onCurrentUserChanged.listen((GoogleSignInAccount? account) async {
      _currentUser = account;
      if (account != null) {
        await _updateProfileFromAccount(account);
      } else {
        _userProfile = null;
      }
      notifyListeners();
    });
    _googleSignIn.signInSilently();
  }

  Future<UserProfile?> signIn() async {
    _isSigningIn = true;
    notifyListeners();
    try {
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account != null) {
        return await _updateProfileFromAccount(account);
      }
    } catch (error) {
      debugPrint('Google Sign-In Exception: $error');
    } finally {
      _isSigningIn = false;
      notifyListeners();
    }
    return null;
  }

  Future<void> signOut() async {
    _isSigningIn = true;
    notifyListeners();
    try {
      await _googleSignIn.disconnect();
      await _googleSignIn.signOut();
      _currentUser = null;
      _userProfile = null;
    } catch (error) {
      debugPrint('Google Sign-Out Exception: $error');
    } finally {
      _isSigningIn = false;
      notifyListeners();
    }
  }

  Future<UserProfile?> _updateProfileFromAccount(GoogleSignInAccount account) async {
    try {
      final GoogleSignInAuthentication authentication = await account.authentication;
      final String? token = authentication.accessToken;

      _userProfile = UserProfile(
        id: account.id,
        displayName: account.displayName ?? 'Clutch Member',
        email: account.email,
        photoUrl: account.photoUrl,
        accessToken: token,
      );
      notifyListeners();
      return _userProfile;
    } catch (e) {
      debugPrint('Error fetching authentication details: $e');
      _userProfile = UserProfile(
        id: account.id,
        displayName: account.displayName ?? 'Clutch Member',
        email: account.email,
        photoUrl: account.photoUrl,
        accessToken: null,
      );
      notifyListeners();
      return _userProfile;
    }
  }
}
