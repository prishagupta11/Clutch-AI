import 'package:flutter/material.dart';
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

    // Dynamic month parameters
    final int year = _selectedDate.year;
    final int month = _selectedDate.month;
    final DateTime firstDayOfMonth = DateTime(year, month, 1);
    
    // weekday is 1 for Monday, 7 for Sunday.
    // Let's align Sunday = index 0.
    final int startOffset = firstDayOfMonth.weekday == 7 ? 0 : firstDayOfMonth.weekday;
    final int totalDaysInMonth = DateUtils.getDaysInMonth(year, month);

    final String monthName = _getMonthName(month);

    // Filter tasks for selected date
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
                // Month Header Selection row
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
                      '$monthName $year'.toUpperCase(),
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

                // Days of week header
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

                // Month Grid
                // Month Grid
GridView.builder(
  shrinkWrap: true,
  physics: const NeverScrollableScrollPhysics(),
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 7,
  ),
  itemCount: startOffset + totalDaysInMonth,
  itemBuilder: (context, index) {
                    if (index < startOffset) {
                      return const SizedBox.shrink();
                    }

                    final int dayNum = index - startOffset + 1;
                    final bool isSelected = _selectedDate.day == dayNum;

                    // Check if day has tasks to show indicator dot
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
                              '$dayNum',
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

                // Selected Timeline Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'TIMELINE // ${_selectedDate.month}/${_selectedDate.day}/${_selectedDate.year}',
                      style: const TextStyle(
                        color: subduedColor,
                        fontSize: 11,
                        fontFamily: 'Courier',
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    Text(
                      '${dailyTasks.length} GOALS DETECTED',
                      style: TextStyle(
                        color: accentColor.withOpacity(0.8),
                        fontSize: 10,
                        fontFamily: 'Courier',
                      ),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFF222925), height: 24, thickness: 1.5),

                // Selected Timeline list
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
