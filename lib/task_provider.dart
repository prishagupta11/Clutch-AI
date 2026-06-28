import 'dart:convert';
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
      debugPrint('Error loading tasks: $e');
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
      debugPrint('Error saving tasks: $e');
    }
  }
}
