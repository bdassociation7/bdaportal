import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from '@/app/providers/AuthProvider';
import { BarChart3, Award, Gift, TrendingUp, Users, Globe } from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuthContext();

  const metrics = [
    {
      title: "My Certifications",
      value: "2",
      icon: Award,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      subtitle: "Active certifications"
    },
    {
      title: "PDC Credits",
      value: "45",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
      subtitle: "Credits earned"
    },
    {
      title: "Pending Applications",
      value: "1",
      icon: BarChart3,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      subtitle: "Exam applications"
    },
    {
      title: "Completed Exams",
      value: "3",
      icon: Gift,
      color: "text-royal-600",
      bgColor: "bg-purple-100",
      subtitle: "This year"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.profile?.first_name || user?.email?.split('@')[0] || 'Member'}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {metric.value}
                  </p>
                  <p className="text-sm font-medium text-gray-900">{metric.title}</p>
                  <p className="text-xs text-gray-500">{metric.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* BDA Certification Pathways */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-600" />
            BDA Certification Pathways
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BDA-CP Certification */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-800">BDA-CP</h3>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Certified Professional</span>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Foundational certification covering Market Analysis, Strategic Growth, and Business Development Analytics.
              </p>
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                View Requirements
              </Button>
            </div>

            {/* BDA-SCP Certification */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800">BDA-SCP</h3>
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Senior Certified</span>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Advanced certification for Global Partnerships, Business Innovation, and Development Consulting.
              </p>
              <Button size="sm" variant="outline" className="w-full border-green-600 text-green-600 hover:bg-green-50">
                Apply for Exam
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Development Credits (PDCs) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Professional Development Credits (PDCs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Current PDC Balance</h4>
                <p className="text-sm text-gray-600">Required for certification maintenance</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">45</p>
                <p className="text-xs text-gray-500">Credits earned</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">BDA BoCK Training</h5>
                <p className="text-sm text-gray-600 mb-3">Business Development Body of Knowledge - Core Modules</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">15 PDCs</span>
                  <Button size="sm" variant="outline">View Details</Button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Strategic Growth Workshop</h5>
                <p className="text-sm text-gray-600 mb-3">Advanced leadership and growth strategies</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">20 PDCs</span>
                  <Button size="sm" variant="outline">View Details</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
