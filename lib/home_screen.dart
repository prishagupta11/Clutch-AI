import 'package:flutter/material.dart';
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
                    'GOALS LIST (${taskProvider.filteredTasks.length})',
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
                '$pct%',
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
            '${provider.tasks.where((t) => t.isCompleted).length} of ${provider.tasks.length} workspace objectives integrated',
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
                content: Text('"${task.title}" deleted from queue.'),
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
                            'Due: ${task.dueDate.month}/${task.dueDate.day}',
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
}
