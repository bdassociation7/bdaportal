/**
 * Booking Confirmation Component
 *
 * Displays booking confirmation with next steps
 * Requirements: task.md Step 4 - Schedule the Exam
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Mail,
  Bell,
  Copy,
  Download,
  Info,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { type ExamTimeslot } from '@/entities/scheduling';
import { useCommonConfirms } from '@/hooks/use-confirm';

export interface BookingConfirmationProps {
  timeslot: ExamTimeslot;
  timezone: string;
  confirmationCode: string;
  onDone: () => void;
}

export default function BookingConfirmation({
  timeslot,
  timezone,
  confirmationCode,
  onDone,
}: BookingConfirmationProps) {
  const { toast } = useToast();
  const { confirm } = useCommonConfirms();

  const handleCopyConfirmationCode = () => {
    navigator.clipboard.writeText(confirmationCode);
    toast({
      title: 'Copied!',
      description: 'Confirmation code copied to clipboard',
    });
  };

  const handleAddToCalendar = () => {
    const startDate = new Date(timeslot.start_time);
    const endDate = new Date(timeslot.end_time);

    // Format dates for calendar (YYYYMMDDTHHMMSSZ)
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = 'BDA Certification Exam';
    const description = `Your scheduled BDA certification exam. Confirmation code: ${confirmationCode}`;
    const location = 'Online (Remote Proctored)';

    // Create Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    // Create ICS file content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BDA Association//Certification Exam//EN
BEGIN:VEVENT
UID:${confirmationCode}@bda-association.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    // Offer both options
    const choice = await confirm({
      title: 'Add to Calendar',
      description: 'Would you like to add this exam to Google Calendar or download an .ics file?',
      confirmText: 'Google Calendar',
      cancelText: 'Download .ics',
      variant: 'default',
    });

    if (choice) {
      window.open(googleCalendarUrl, '_blank');
    } else {
      // Download ICS file
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bda-exam-${confirmationCode}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    toast({
      title: 'Calendar Event Created',
      description: 'Your exam has been added to your calendar',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    };
  };

  const startDateTime = formatDateTime(timeslot.start_time);
  const endDateTime = formatDateTime(timeslot.end_time);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Your certification exam has been successfully scheduled
          </p>
        </div>

        {/* Confirmation Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>
              Please save this information for your records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Confirmation Code */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Confirmation Code</p>
                <p className="text-2xl font-bold text-blue-900">{confirmationCode}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyConfirmationCode}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>
                <p className="font-semibold text-lg">{startDateTime.date}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Time</span>
                </div>
                <p className="font-semibold text-lg">{startDateTime.time}</p>
                <p className="text-sm text-gray-600">Ends: {endDateTime.time}</p>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>Your Timezone</span>
              </div>
              <p className="font-medium">{timezone}</p>
            </div>

            {/* Add to Calendar Button */}
            <Button
              onClick={handleAddToCalendar}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Add to Calendar
            </Button>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-blue-100 p-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Email Confirmation</h4>
                <p className="text-sm text-gray-600">
                  You will receive a confirmation email with your booking details and confirmation code.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-green-100 p-2">
                  <Bell className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Exam Reminders</h4>
                <p className="text-sm text-gray-600">
                  We'll send you reminders 48 hours and 24 hours before your exam with important instructions.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="rounded-full bg-purple-100 p-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Prepare for Exam Day</h4>
                <p className="text-sm text-gray-600">
                  Make sure you have a stable internet connection, working webcam, and a quiet environment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Important Reminders</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Join at least 15 minutes before your scheduled time</li>
              <li>Ensure your identity verification is approved before exam day</li>
              <li>Have a valid government-issued ID ready for verification</li>
              <li>Test your equipment using the system check before exam day</li>
              <li>Contact support if you need to reschedule</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={onDone}
            className="flex-1"
            size="lg"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
