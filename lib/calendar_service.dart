import 'dart:convert';
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
    final url = Uri.parse('$_baseUrl/calendars/$calendarId/events');
    
    try {
      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode(event.toJson()),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final decoded = json.decode(response.body) as Map<String, dynamic>;
        debugPrint('Successfully added event: ${decoded['htmlLink']}');
        return {
          'success': true,
          'eventId': decoded['id'] as String? ?? '',
          'htmlLink': decoded['htmlLink'] as String? ?? '',
        };
      } else {
        debugPrint('Calendar API Error: ${response.statusCode} - ${response.body}');
        return {
          'success': false,
          'error': 'API returned status code ${response.statusCode}: ${response.body}',
        };
      }
    } catch (e) {
      debugPrint('Calendar Service Exception: $e');
      return {
        'success': false,
        'error': e.toString(),
      };
    }
  }
}
