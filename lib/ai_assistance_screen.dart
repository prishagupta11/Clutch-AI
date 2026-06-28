import 'dart:convert';
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
          .map((t) => '- [${t.isCompleted ? "x" : " "}] ${t.title} (${t.category}) [Due: ${t.dueDate.toIso8601String()}]')
          .join('\n');

      final systemPrompt = '''
You are Clutch AI Agent, a structural workspace optimization assistant inside the Clutch AI Flutter app.
Analyze the user request in relation to existing tasks:
$existingTasks

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
3. Return ONLY valid JSON. Absolutely no markdown fences like ```json.
''';

      // Live Google Generative Language URL gateway
      final response = await http.post(
        Uri.parse('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY_HERE'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'contents': [
            {
              'role': 'user',
              'parts': [
                {'text': '$systemPrompt\n\nUser request: $text'}
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
        
        // Sanitize raw text to ensure it's clean JSON
        String cleanedText = rawText.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replaceAll(RegExp(r'^```(json)?|```$'), '').trim();
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
      debugPrint('AI Assistance Exception: $e');
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
          'Confirm Calendar & Workspace Sync for: "$title"?',
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
        duration: const Duration(seconds: 12),
        backgroundColor: componentColor,
        action: SnackBarAction(
          label: 'CONFIRM',
          textColor: accentColor,
          onPressed: () async {
            final taskProvider = Provider.of<TaskProvider>(context, listen: false);
            
            // Append Locally
            await taskProvider.addTask(title, 'General', dueDate: deadline);

            // Push to REST Calendar Service
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
                    content: Text('Added task locally, but Calendar sync failed: ${calResult['error']}'),
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
    String reply = 'Workspace optimization completed (Simulation Mode).\n\n';
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
      reply += 'System is active and listening. Command "$text" logged into the development logs.';
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
                              '${message.timestamp.hour.toString().padLeft(2, '0')}:${message.timestamp.minute.toString().padLeft(2, '0')}',
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
}
