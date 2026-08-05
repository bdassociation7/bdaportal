import { useState } from 'react';
import { Star, Award, Trophy, Heart, Users, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/app/providers/AuthProvider';

/**
 * My Recognitions Page
 * Display badges, awards, and special recognitions
 */

type RecognitionType = 'badge' | 'award' | 'contribution' | 'volunteer';

interface Recognition {
  id: string;
  title: string;
  description: string;
  type: RecognitionType;
  icon_url?: string;
  earned_date: string;
  issuer: string;
}

// Mock data - will be replaced with actual API
const MOCK_RECOGNITIONS: Recognition[] = [
  {
    id: '1',
    title: 'Early Adopter',
    description: 'One of the first professionals to earn the BDA-CP certification',
    type: 'badge',
    earned_date: '2024-01-15',
    issuer: 'BDA Global',
  },
  {
    id: '2',
    title: 'Community Contributor',
    description: 'Active contributor to the BDA community forums and knowledge base',
    type: 'contribution',
    earned_date: '2024-02-01',
    issuer: 'BDA Community',
  },
  {
    id: '3',
    title: 'Excellence in Analytics',
    description: 'Awarded for outstanding performance in certification exam (score >90%)',
    type: 'award',
    earned_date: '2024-01-20',
    issuer: 'BDA Global',
  },
  {
    id: '4',
    title: 'Volunteer Mentor',
    description: 'Volunteered as a mentor for aspiring data analytics professionals',
    type: 'volunteer',
    earned_date: '2024-03-05',
    issuer: 'BDA Mentorship Program',
  },
];

const RECOGNITION_TYPE_CONFIG = {
  badge: {
    icon: Award,
    label: 'Badge',
    color: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  award: {
    icon: Trophy,
    label: 'Award',
    color: 'from-yellow-500 to-yellow-700',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
  },
  contribution: {
    icon: Users,
    label: 'Contribution',
    color: 'from-green-500 to-green-700',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  volunteer: {
    icon: Heart,
    label: 'Volunteer',
    color: 'from-pink-500 to-pink-700',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
};

export default function MyRecognitions() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<RecognitionType | 'all'>('all');

  const filteredRecognitions = MOCK_RECOGNITIONS.filter(
    (rec) => selectedType === 'all' || rec.type === selectedType
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRecognitionCount = (type: RecognitionType) => {
    return MOCK_RECOGNITIONS.filter((r) => r.type === type).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Star className="h-8 w-8" />
          My Recognitions
        </h1>
        <p className="mt-2 opacity-90">
          Badges, awards, and special recognitions you've earned
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(RECOGNITION_TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          const count = getRecognitionCount(type as RecognitionType);

          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all ${
                selectedType === type ? 'ring-2 ring-offset-2 ring-yellow-500' : ''
              }`}
              onClick={() =>
                setSelectedType(selectedType === type ? 'all' : (type as RecognitionType))
              }
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`h-12 w-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${config.textColor}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{config.label}s</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recognitions Grid */}
      {filteredRecognitions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No recognitions yet</p>
            <p className="text-sm text-gray-500">
              Keep contributing and engaging with the BDA community to earn recognitions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecognitions.map((recognition) => {
            const typeConfig = RECOGNITION_TYPE_CONFIG[recognition.type];
            const Icon = typeConfig.icon;

            return (
              <Card key={recognition.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-4">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div
                      className={`h-20 w-20 rounded-full bg-gradient-to-br ${typeConfig.color} flex items-center justify-center text-white shadow-lg`}
                    >
                      <Icon className="h-10 w-10" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-2">
                    <Badge variant="outline" className={typeConfig.textColor}>
                      {typeConfig.label}
                    </Badge>
                    <h3 className="font-bold text-gray-900 text-lg">{recognition.title}</h3>
                    <p className="text-sm text-gray-600">{recognition.description}</p>
                  </div>

                  {/* Meta */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(recognition.earned_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Issued by {recognition.issuer}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Footer */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Star className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">Earn More Recognitions</h3>
              <p className="text-sm text-yellow-800">
                Engage with the BDA community, contribute to discussions, volunteer as a mentor, and
                achieve excellence in your certification journey to earn more badges and awards.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

MyRecognitions.displayName = 'MyRecognitions';
