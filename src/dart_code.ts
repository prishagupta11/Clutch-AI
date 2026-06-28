export const DART_FILES: { [key: string]: string } = {
  "lib/main.dart": `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'task_provider.dart';
import 'auth_service.dart';
import 'home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ClutchAIApp());
}

class ClutchAIApp extends StatelessWidget {
  const ClutchAIApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => TaskProvider()),
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: MaterialApp(
        title: 'Clutch AI',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF161A18),
          fontFamily: 'Inter',
        ),
        home: const HomeScreen(),
      ),
    );
  }
}`,

  "lib/task_provider.dart": `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TodoTask {
  final String id;
  final String title;
  final String category;
  final bool isCompleted;
  final DateTime dueDate;

  TodoTask({
    required this.id,
    required this.title,
    required this.category,
    this.isCompleted = false,
    required this.dueDate,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'isCompleted': isCompleted,
      'dueDate': dueDate.toIso8601String(),
    };
  }

  factory TodoTask.fromMap(Map<String, dynamic> map) {
    return TodoTask(
      id: map['id'] as String? ?? '',
      title: map['title'] as String? ?? '',
      category: map['category'] as String? ?? 'General',
      isCompleted: map['isCompleted'] as bool? ?? false,
      dueDate: map['dueDate'] != null
          ? DateTime.parse(map['dueDate'] as String)
          : DateTime.now(),
    );
  }

  TodoTask copyWith({
    String? id,
    String? title,
    String? category,
    bool? isCompleted,
    DateTime? dueDate,
  }) {
    return TodoTask(
      id: id ?? this.id,
      title: title ?? this.title,
      category: category ?? this.category,
      isCompleted: isCompleted ?? this.isCompleted,
      dueDate: dueDate ?? this.dueDate,
    );
  }
}

class TaskProvider with ChangeNotifier {
  List<TodoTask> _tasks = [];
  bool _isLoading = false;
  String _selectedCategory = 'All';

  List<TodoTask> get tasks => _tasks;
  bool get isLoading => _isLoading;
  String get selectedCategory => _selectedCategory;

  List<TodoTask> get filteredTasks {
    if (_selectedCategory == 'All') {
      return _tasks;
    }
    return _tasks.where((task) => task.category.toLowerCase() == _selectedCategory.toLowerCase()).toList();
  }

  double get completionRate {
    if (_tasks.isEmpty) return 0.0;
    final completedCount = _tasks.where((t) => t.isCompleted).length;
    return completedCount / _tasks.length;
  }

  TaskProvider() {
    loadTasks();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> loadTasks() async {
    _isLoading = true;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      final tasksJson = prefs.getStringList('clutch_tasks') ?? [];
      _tasks = tasksJson.map((item) {
        final Map<String, dynamic> decoded = json.decode(item) as Map<String, dynamic>;
        return TodoTask.fromMap(decoded);
      }).toList();
    } catch (e) {
      debugPrint('Error loading tasks: \$e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addTask(String title, String category, {DateTime? dueDate}) async {
    final newTask = TodoTask(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      category: category,
      dueDate: dueDate ?? DateTime.now().add(const Duration(days: 1)),
    );
    _tasks.add(newTask);
    notifyListeners();
    await _saveTasksToPrefs();
  }

  Future<void> toggleTask(String id) async {
    final index = _tasks.indexWhere((task) => task.id == id);
    if (index != -1) {
      _tasks[index] = _tasks[index].copyWith(isCompleted: !_tasks[index].isCompleted);
      notifyListeners();
      await _saveTasksToPrefs();
    }
  }

  Future<void> deleteTask(String id) async {
    _tasks.removeWhere((task) => task.id == id);
    notifyListeners();
    await _saveTasksToPrefs();
  }

  Future<void> clearAllTasks() async {
    _tasks.clear();
    notifyListeners();
    await _saveTasksToPrefs();
  }

  Future<void> _saveTasksToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tasksJson = _tasks.map((task) => json.encode(task.toMap())).toList();
      await prefs.setStringList('clutch_tasks', tasksJson);
    } catch (e) {
      debugPrint('Error saving tasks: \$e');
    }
  }
}`,

  "lib/auth_service.dart": `import 'package:flutter/material.dart';
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
      'email',
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
      debugPrint('Google Sign-In Exception: \$error');
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
      debugPrint('Google Sign-Out Exception: \$error');
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
      debugPrint('Error fetching authentication details: \$e');
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
}`,

  "lib/calendar_service.dart": `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class CalendarEvent {
  final String title;
  final String description;
  final DateTime startTime;
  final DateTime endTime;

  CalendarEvent({
    required this.title,
    this.description = '',
    required this.startTime,
    required this.endTime,
  });

  Map<String, dynamic> toJson() {
    return {
      'summary': title,
      'description': description,
      'start': {
        'dateTime': startTime.toUtc().toIso8601String(),
        'timeZone': 'UTC',
      },
      'end': {
        'dateTime': endTime.toUtc().toIso8601String(),
        'timeZone': 'UTC',
      },
    };
  }
}

class CalendarService {
  static const String _baseUrl = 'https://www.googleapis.com/calendar/v3';

  static Future<Map<String, dynamic>> createEvent({
    required String accessToken,
    required CalendarEvent event,
    String calendarId = 'primary',
  }) async {
    final url = Uri.parse('\$_baseUrl/calendars/\$calendarId/events');
    
    try {
      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Bearer \$accessToken',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode(event.toJson()),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = json.decode(response.body) as Map<String, dynamic>;
        debugPrint('Successfully added event: \${decoded['htmlLink']}');
        return {
          'success': true,
          'eventId': decoded['id'] as String? ?? '',
          'htmlLink': decoded['htmlLink'] as String? ?? '',
        };
      } else {
        debugPrint('Calendar API Error: \${response.statusCode} - \${response.body}');
        return {
          'success': false,
          'error': 'API returned status code \${response.statusCode}: \${response.body}',
        };
      }
    } catch (e) {
      debugPrint('Calendar Service Exception: \$e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }
}`,

  "lib/ai_assistance_screen.dart": `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'task_provider.dart';
import 'calendar_service.dart';

class AIMessage {
  final String sender;
  final String content;
  final DateTime timestamp;
  final bool isUser;

  AIMessage({
    required this.sender,
    required this.content,
    required this.timestamp,
    required this.isUser,
  });
}

class AIAssistanceScreen extends StatefulWidget {
  final String? userEmail;
  final String? googleAccessToken;

  const AIAssistanceScreen({
    Key? key,
    this.userEmail,
    this.googleAccessToken,
  }) : super(key: key);

  @override
  State<AIAssistanceScreen> createState() => _AIAssistanceScreenState();
}

class _AIAssistanceScreenState extends State<AIAssistanceScreen> {
  final TextEditingController _messageController = TextEditingController();
  final List<AIMessage> _messages = [];
  final ScrollController _scrollController = ScrollController();
  bool _isGenerating = false;

  static const Color canvasColor = Color(0xFF161A18);
  static const Color componentColor = Color(0xFF222925);
  static const Color accentColor = Color(0xFF96AC9D);
  static const Color subduedColor = Color(0xFFBDC7BF);

  @override
  void initState() {
    super.initState();
    _messages.add(AIMessage(
      sender: 'Clutch AI Agent',
      content: 'System loaded in Sage & Moss environment. Ready to optimize your workspace. Ask me to schedule goals, and I will assist in parsing schedules and synchronizing with Google Calendar.',
      timestamp: DateTime.now(),
      isUser: false,
    ));
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    setState(() {
      _messages.add(AIMessage(
        sender: widget.userEmail ?? 'Clutch Member',
        content: text,
        timestamp: DateTime.now(),
        isUser: true,
      ));
      _isGenerating = true;
    });
    _scrollToBottom();

    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      final existingTasks = taskProvider.tasks
          .map((t) => '- [\${t.isCompleted ? "x" : " "}] \${t.title} (\${t.category}) [Due: \${t.dueDate.toIso8601String()}]')
          .join('\\n');

      final systemPrompt = '''
You are Clutch AI Agent, a structural workspace optimization assistant inside the Clutch AI Flutter app.
Analyze the user request in relation to existing tasks:
\$existingTasks

You must return a raw, un-fenced JSON payload matching this exact schema:
{
  "aiResponse": "your friendly, concise conversational markdown reply detailing what you processed",
  "expectsDeadlineInput": false,
  "shouldUpdateCalendar": true,
  "taskDetailsForCalendar": {
    "title": "extracted task name to be scheduled",
    "extractedDeadline": "ISO 8601 timestamp string representing the task due date (e.g., 2026-06-28T10:00:00Z)"
  }
}

Rules:
1. "shouldUpdateCalendar" must be true if the user asks to schedule, plan, add, or sync any event or goal.
2. Ensure "taskDetailsForCalendar" has a valid "title" and "extractedDeadline" (which must be a valid future ISO 8601 string or reasonable default) when "shouldUpdateCalendar" is true.
3. Return ONLY valid JSON. Absolutely no markdown fences like \`\`\`.
''';

      final response = await http.post(
        Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY_HERE'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'contents': [
            {
              'role': 'user',
              'parts': [
                {'text': '\$systemPrompt\\n\\nUser request: \$text'}
              ]
            }
          ],
          'generationConfig': {
            'responseMimeType': 'application/json',
          }
        }),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body) as Map<String, dynamic>;
        final String rawText = data['candidates']?[0]?['content']?['parts']?[0]?['text'] as String? ?? '{}';
        
        String cleanedText = rawText.trim();
        if (cleanedText.startsWith('\\\`\\\`\\\`')) {
          if (cleanedText.startsWith('\\\`\\\`\\\`json')) {
            cleanedText = cleanedText.substring(7);
          } else {
            cleanedText = cleanedText.substring(3);
          }
          if (cleanedText.endsWith('\\\`\\\`\\\`')) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3);
          }
          cleanedText = cleanedText.trim();
        }

        final Map<String, dynamic> parsedJson = json.decode(cleanedText) as Map<String, dynamic>;

        final aiResponse = parsedJson['aiResponse'] as String? ?? 'Optimization processed successfully.';
        final shouldUpdateCalendar = parsedJson['shouldUpdateCalendar'] as bool? ?? false;
        final taskDetails = parsedJson['taskDetailsForCalendar'] as Map<String, dynamic>?;

        setState(() {
          _messages.add(AIMessage(
            sender: 'Clutch AI Agent',
            content: aiResponse,
            timestamp: DateTime.now(),
            isUser: false,
          ));
        });

        if (shouldUpdateCalendar && taskDetails != null) {
          _fireSyncSnackbar(taskDetails);
        }
      } else {
        _handleSimulationFallback(text, taskProvider);
      }
    } catch (e) {
      debugPrint('AI Assistance Exception: \$e');
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      _handleSimulationFallback(text, taskProvider);
    } finally {
      setState(() {
        _isGenerating = false;
      });
      _scrollToBottom();
    }
  }

  void _fireSyncSnackbar(Map<String, dynamic> taskDetails) {
    final title = taskDetails['title'] as String? ?? 'Workspace Objective';
    final deadlineStr = taskDetails['extractedDeadline'] as String? ?? '';
    final deadline = deadlineStr.isNotEmpty 
        ? DateTime.parse(deadlineStr) 
        : DateTime.now().add(const Duration(days: 1));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Confirm Calendar & Workspace Sync for: "\$title"?',
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
        duration: const Duration(seconds: 12),
        backgroundColor: componentColor,
        action: SnackBarAction(
          label: 'CONFIRM',
          textColor: accentColor,
          onPressed: () async {
            final taskProvider = Provider.of<TaskProvider>(context, listen: false);
            
            await taskProvider.addTask(title, 'General', dueDate: deadline);

            if (widget.googleAccessToken != null && widget.googleAccessToken!.isNotEmpty) {
              final calendarEvent = CalendarEvent(
                title: title,
                description: 'Planned and scheduled dynamically by Clutch AI.',
                startTime: deadline,
                endTime: deadline.add(const Duration(hours: 1)),
              );

              final calResult = await CalendarService.createEvent(
                accessToken: widget.googleAccessToken!,
                event: calendarEvent,
              );

              if (calResult['success'] == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Successfully synced local workspace & Google Calendar event!'),
                    backgroundColor: componentColor,
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Added task locally, but Calendar sync failed: \${calResult['error']}'),
                    backgroundColor: Colors.redAccent,
                  ),
                );
              }
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Added locally! Authenticate Google to push to live Calendar REST.'),
                  backgroundColor: componentColor,
                ),
              );
            }
          },
        ),
      ),
    );
  }

  void _handleSimulationFallback(String text, TaskProvider provider) {
    String reply = 'Workspace optimization completed (Simulation Mode).\\n\\n';
    bool shouldSync = false;
    Map<String, dynamic> mockDetails = {};

    if (text.toLowerCase().contains('task') || text.toLowerCase().contains('add') || text.toLowerCase().contains('plan') || text.toLowerCase().contains('schedule')) {
      shouldSync = true;
      mockDetails = {
        'title': 'Synthesize layout bindings',
        'extractedDeadline': DateTime.now().add(const Duration(days: 1)).toIso8601String()
      };
      reply += 'I detected your scheduling intent. I suggest adding a critical task: **Synthesize layout bindings** and pushing it to the Google Calendar API.';
    } else {
      reply += 'System is active and listening. Command "\$text" logged into the development logs.';
    }

    setState(() {
      _messages.add(AIMessage(
        sender: 'Clutch AI Simulator',
        content: reply,
        timestamp: DateTime.now(),
        isUser: false,
      ));
    });

    if (shouldSync) {
      _fireSyncSnackbar(mockDetails);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: canvasColor,
      appBar: AppBar(
        title: const Text(
          'CLUTCH // AI TERMINAL',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
            fontFamily: 'Courier',
            letterSpacing: 1.2,
          ),
        ),
        backgroundColor: componentColor,
        elevation: 0,
        iconTheme: const IconThemeData(color: accentColor),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final message = _messages[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: message.isUser ? componentColor : Colors.black.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: message.isUser ? Colors.transparent : accentColor.withOpacity(0.15),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              message.sender.toUpperCase(),
                              style: TextStyle(
                                color: message.isUser ? subduedColor : accentColor,
                                fontSize: 11,
                                fontFamily: 'Courier',
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '\${message.timestamp.hour.toString().padLeft(2, '0')}:\${message.timestamp.minute.toString().padLeft(2, '0')}',
                              style: const TextStyle(
                                color: subduedColor,
                                fontSize: 10,
                                fontFamily: 'Courier',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          message.content,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            if (_isGenerating)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'COMPILING RESPONSE...',
                      style: TextStyle(
                        color: accentColor.withOpacity(0.8),
                        fontSize: 11,
                        fontFamily: 'Courier',
                      ),
                    ),
                  ],
                ),
              ),
            Container(
              padding: const EdgeInsets.all(12),
              color: componentColor,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      decoration: const InputDecoration(
                        hintText: 'Synthesize workspaces...',
                        hintStyle: TextStyle(color: subduedColor, fontSize: 14),
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.terminal, color: accentColor),
                    onPressed: _sendMessage,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}`,

  "lib/home_screen.dart": `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'task_provider.dart';
import 'auth_service.dart';
import 'ai_assistance_screen.dart';
import 'calendar_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _taskController = TextEditingController();
  String _selectedCategoryForNewTask = 'Coding';

  static const Color canvasColor = Color(0xFF161A18);
  static const Color componentColor = Color(0xFF222925);
  static const Color accentColor = Color(0xFF96AC9D);
  static const Color subduedColor = Color(0xFFBDC7BF);

  final List<String> _categories = ['All', 'University', 'Coding', 'General'];
  final List<String> _creationCategories = ['University', 'Coding', 'General'];

  @override
  Widget build(BuildContext context) {
    final taskProvider = Provider.of<TaskProvider>(context);
    final authService = Provider.of<AuthService>(context);

    return Scaffold(
      backgroundColor: canvasColor,
      appBar: AppBar(
        title: const Text(
          'CLUTCH AI // CORE',
          style: TextStyle(
            color: accentColor,
            fontWeight: FontWeight.w900,
            fontSize: 18,
            fontFamily: 'Courier',
            letterSpacing: 1.5,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month, color: accentColor),
            tooltip: 'Month Scheduler',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CalendarScreen(),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.terminal, color: accentColor),
            tooltip: 'Clutch AI Terminal',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => AIAssistanceScreen(
                    userEmail: authService.userProfile?.email,
                    googleAccessToken: authService.userProfile?.accessToken,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildAuthBanner(authService),
              const SizedBox(height: 16),
              _buildProgressCard(taskProvider),
              const SizedBox(height: 16),
              const Text(
                'WORKSPACES // FILTERS',
                style: TextStyle(
                  color: subduedColor,
                  fontSize: 11,
                  fontFamily: 'Courier',
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              _buildCategorySelector(taskProvider),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'GOALS LIST (\${taskProvider.filteredTasks.length})',
                    style: const TextStyle(
                      color: subduedColor,
                      fontSize: 11,
                      fontFamily: 'Courier',
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                  if (taskProvider.filteredTasks.isNotEmpty)
                    Text(
                      'SWIPE LEFT TO DISMISS',
                      style: TextStyle(
                        color: accentColor.withOpacity(0.6),
                        fontSize: 9,
                        fontFamily: 'Courier',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: taskProvider.isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                        ),
                      )
                    : taskProvider.filteredTasks.isEmpty
                        ? _buildEmptyState()
                        : _buildTaskList(taskProvider),
              ),
              _buildAddTaskBlock(taskProvider),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAuthBanner(AuthService authService) {
    final profile = authService.userProfile;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: componentColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: accentColor.withOpacity(0.1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: accentColor,
                backgroundImage: profile?.photoUrl != null
                    ? NetworkImage(profile!.photoUrl!)
                    : null,
                child: profile?.photoUrl == null
                    ? Text(
                        (profile?.displayName ?? 'C')[0].toUpperCase(),
                        style: const TextStyle(
                          color: canvasColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile != null ? 'ACCOUNT ONLINE' : 'OFFLINE CONSOLE',
                    style: TextStyle(
                      color: profile != null ? accentColor : subduedColor,
                      fontSize: 9,
                      fontFamily: 'Courier',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    profile?.displayName ?? 'Offline Clutch Member',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
          TextButton.icon(
            onPressed: () {
              if (authService.isAuthenticated) {
                authService.signOut();
              } else {
                authService.signIn();
              }
            },
            icon: Icon(
              authService.isAuthenticated ? Icons.logout : Icons.login,
              size: 14,
              color: accentColor,
            ),
            label: Text(
              authService.isAuthenticated ? 'LOGOUT' : 'LOGIN',
              style: const TextStyle(
                color: accentColor,
                fontSize: 11,
                fontFamily: 'Courier',
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressCard(TaskProvider provider) {
    final rate = provider.completionRate;
    final pct = (rate * 100).toInt();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: componentColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accentColor.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'ARCHITECTURE HEALTH',
                style: TextStyle(
                  color: subduedColor,
                  fontSize: 11,
                  fontFamily: 'Courier',
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                ),
              ),
              Text(
                '\$pct%',
                style: const TextStyle(
                  color: accentColor,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Courier',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: rate,
              minHeight: 6,
              backgroundColor: Colors.black.withOpacity(0.3),
              valueColor: const AlwaysStoppedAnimation<Color>(accentColor),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '\${provider.tasks.where((t) => t.isCompleted).length} of \${provider.tasks.length} workspace objectives integrated',
            style: const TextStyle(color: subduedColor, fontSize: 11, height: 1.3),
          ),
        ],
      ),
    );
  }

  Widget _buildCategorySelector(TaskProvider provider) {
    return SizedBox(
      height: 36,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final cat = _categories[index];
          final isSelected = provider.selectedCategory.toLowerCase() == cat.toLowerCase();
          return Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: ChoiceChip(
              label: Text(
                cat.toUpperCase(),
                style: TextStyle(
                  color: isSelected ? canvasColor : subduedColor,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Courier',
                ),
              ),
              selected: isSelected,
              selectedColor: accentColor,
              backgroundColor: componentColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(6),
              ),
              onSelected: (_) {
                provider.setCategory(cat);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.layers_clear, size: 36, color: accentColor.withOpacity(0.2)),
          const SizedBox(height: 12),
          const Text(
            'NO COMPILATIONS',
            style: TextStyle(
              color: subduedColor,
              fontSize: 11,
              fontFamily: 'Courier',
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Create a task below or synthesize with Clutch AI terminal.',
            textAlign: TextAlign.center,
            style: TextStyle(color: subduedColor, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskList(TaskProvider provider) {
    final tasks = provider.filteredTasks;
    return ListView.builder(
      itemCount: tasks.length,
      padding: const EdgeInsets.only(bottom: 16),
      itemBuilder: (context, index) {
        final task = tasks[index];
        return Dismissible(
          key: Key(task.id),
          direction: DismissDirection.endToStart,
          onDismissed: (direction) {
            provider.deleteTask(task.id);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('"\${task.title}" deleted from queue.'),
                backgroundColor: componentColor,
                duration: const Duration(seconds: 2),
              ),
            );
          },
          background: Container(
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.only(right: 20),
            margin: const EdgeInsets.symmetric(vertical: 4),
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
          ),
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: componentColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: task.isCompleted ? Colors.transparent : accentColor.withOpacity(0.08),
              ),
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {
                    provider.toggleTask(task.id);
                  },
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: task.isCompleted ? accentColor : Colors.transparent,
                      border: Border.all(color: accentColor, width: 2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: task.isCompleted
                        ? const Icon(Icons.check, size: 14, color: canvasColor)
                        : null,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.title,
                        style: TextStyle(
                          color: task.isCompleted ? subduedColor.withOpacity(0.6) : Colors.white,
                          fontSize: 14,
                          decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.3),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              task.category.toUpperCase(),
                              style: const TextStyle(
                                color: accentColor,
                                fontSize: 9,
                                fontFamily: 'Courier',
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          Text(
                            'Due: \${task.dueDate.month}/\${task.dueDate.day}',
                            style: const TextStyle(
                              color: subduedColor,
                              fontSize: 10,
                              fontFamily: 'Courier',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAddTaskBlock(TaskProvider provider) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      color: canvasColor,
      child: Column(
        children: [
          Row(
            children: _creationCategories.map((cat) {
              final isSel = _selectedCategoryForNewTask == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 6.0),
                child: ChoiceChip(
                  label: Text(
                    cat.toUpperCase(),
                    style: TextStyle(
                      color: isSel ? canvasColor : subduedColor,
                      fontSize: 9,
                      fontFamily: 'Courier',
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  selected: isSel,
                  selectedColor: accentColor,
                  backgroundColor: componentColor,
                  padding: EdgeInsets.zero,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  onSelected: (_) {
                    setState(() {
                      _selectedCategoryForNewTask = cat;
                    });
                  },
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: componentColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: accentColor.withOpacity(0.1)),
                  ),
                  child: TextField(
                    controller: _taskController,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: const InputDecoration(
                      hintText: 'Deploy custom widget bindings...',
                      hintStyle: TextStyle(color: subduedColor, fontSize: 13),
                      border: InputBorder.none,
                    ),
                    onSubmitted: (val) {
                      _submitTask(provider);
                    },
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: IconButton(
                  icon: const Icon(Icons.add, color: canvasColor),
                  onPressed: () {
                    _submitTask(provider);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _submitTask(TaskProvider provider) {
    final text = _taskController.text.trim();
    if (text.isEmpty) return;
    provider.addTask(text, _selectedCategoryForNewTask);
    _taskController.clear();
    FocusScope.of(context).unfocus();
  }
}`,

  "lib/calendar_screen.dart": `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'task_provider.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({Key? key}) : super(key: key);

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  DateTime _selectedDate = DateTime.now();

  static const Color canvasColor = Color(0xFF161A18);
  static const Color componentColor = Color(0xFF222925);
  static const Color accentColor = Color(0xFF96AC9D);
  static const Color subduedColor = Color(0xFFBDC7BF);

  @override
  Widget build(BuildContext context) {
    final taskProvider = Provider.of<TaskProvider>(context);

    final int year = _selectedDate.year;
    final int month = _selectedDate.month;
    final DateTime firstDayOfMonth = DateTime(year, month, 1);
    
    final int startOffset = firstDayOfMonth.weekday == 7 ? 0 : firstDayOfMonth.weekday;
    final int totalDaysInMonth = DateUtils.getDaysInMonth(year, month);

    final String monthName = _getMonthName(month);

    final List<TodoTask> dailyTasks = taskProvider.tasks.where((task) {
      return task.dueDate.year == _selectedDate.year &&
             task.dueDate.month == _selectedDate.month &&
             task.dueDate.day == _selectedDate.day;
    }).toList();

    return Scaffold(
      backgroundColor: canvasColor,
      appBar: AppBar(
        title: const Text(
          'CHRONOS SCHEDULER',
          style: TextStyle(
            color: accentColor,
            fontWeight: FontWeight.bold,
            fontSize: 14,
            fontFamily: 'Courier',
            letterSpacing: 1.2,
          ),
        ),
        backgroundColor: componentColor,
        elevation: 0,
        iconTheme: const IconThemeData(color: accentColor),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_left, color: accentColor),
                      onPressed: () {
                        setState(() {
                          _selectedDate = DateTime(
                            month == 1 ? year - 1 : year,
                            month == 1 ? 12 : month - 1,
                            1,
                          );
                        });
                      },
                    ),
                    Text(
                      '\$monthName \$year'.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Courier',
                        letterSpacing: 1.5,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_right, color: accentColor),
                      onPressed: () {
                        setState(() {
                          _selectedDate = DateTime(
                            month == 12 ? year + 1 : year,
                            month == 12 ? 1 : month + 1,
                            1,
                          );
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 7,
                  childAspectRatio: 1.2,
                  children: const [
                    _DayHeader('S'),
                    _DayHeader('M'),
                    _DayHeader('T'),
                    _DayHeader('W'),
                    _DayHeader('T'),
                    _DayHeader('F'),
                    _DayHeader('S'),
                  ],
                ),
                const SizedBox(height: 8),

                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 7,
                  itemCount: startOffset + totalDaysInMonth,
                  itemBuilder: (context, index) {
                    if (index < startOffset) {
                      return const SizedBox.shrink();
                    }

                    final int dayNum = index - startOffset + 1;
                    final bool isSelected = _selectedDate.day == dayNum;

                    final bool hasTasks = taskProvider.tasks.any((t) =>
                        t.dueDate.year == year &&
                        t.dueDate.month == month &&
                        t.dueDate.day == dayNum);

                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedDate = DateTime(year, month, dayNum);
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected ? accentColor : Colors.transparent,
                          border: Border.all(
                            color: isSelected ? accentColor : Colors.transparent,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '\$dayNum',
                              style: TextStyle(
                                color: isSelected ? canvasColor : Colors.white,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                fontSize: 13,
                              ),
                            ),
                            if (hasTasks)
                              Container(
                                margin: const EdgeInsets.only(top: 2),
                                width: 4,
                                height: 4,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected ? canvasColor : accentColor,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'TIMELINE // \${_selectedDate.month}/\${_selectedDate.day}/\${_selectedDate.year}',
                      style: const TextStyle(
                        color: subduedColor,
                        fontSize: 11,
                        fontFamily: 'Courier',
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      '\${dailyTasks.length} GOALS DETECTED',
                      style: TextStyle(
                        color: accentColor.withOpacity(0.8),
                        fontSize: 10,
                        fontFamily: 'Courier',
                      ),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFF222925), height: 24, thickness: 1.5),

                if (dailyTasks.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20.0),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.event_note, size: 28, color: accentColor.withOpacity(0.2)),
                          const SizedBox(height: 8),
                          const Text(
                            'NO TIMELINE METRICS',
                            style: TextStyle(
                              color: subduedColor,
                              fontSize: 10,
                              fontFamily: 'Courier',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: dailyTasks.length,
                    itemBuilder: (context, index) {
                      final task = dailyTasks[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: componentColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              task.isCompleted ? Icons.check_circle : Icons.circle_outlined,
                              color: accentColor,
                              size: 16,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    task.title,
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    task.category.toUpperCase(),
                                    style: TextStyle(
                                      color: accentColor.withOpacity(0.7),
                                      fontSize: 9,
                                      fontFamily: 'Courier',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getMonthName(int month) {
    const List<String> months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }
}

class _DayHeader extends StatelessWidget {
  final String day;
  const _DayHeader(this.day, {Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        day,
        style: const TextStyle(
          color: Color(0xFFBDC7BF),
          fontSize: 11,
          fontFamily: 'Courier',
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
`
};
