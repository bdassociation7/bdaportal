import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, ExternalLink } from "lucide-react";

export default function AuthorizedProviders() {
  const { t } = useLanguage();

  const providers = [
    {
      id: "atap",
      title: "ATAP",
      fullName: "Authorised Training Application Provider",
      description:
        "Become an authorised provider for training applications and expand your service offerings.",
      image: "/placeholder.svg",
      status: "Available",
      requirements: ["Minimum 2 years experience", "Valid certification"],
    },
    {
      id: "atp",
      title: "ATP",
      fullName: "Authorised Training Provider",
      description:
        "Join our network of authorised training providers and deliver high-quality educational content.",
      image: "/placeholder.svg",
      status: "Available",
      requirements: ["Training facility", "Qualified instructors"],
    },
    {
      id: "aup",
      title: "AUP",
      fullName: "Authorised Upgrade Provider",
      description:
        "Provide upgrade services and help professionals advance their certifications.",
      image: "/placeholder.svg",
      status: "Limited Availability",
      requirements: ["Advanced certification", "Proven track record"],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "text-green-700 bg-green-100";
      case "Limited Availability":
        return "text-yellow-700 bg-yellow-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("nav.authorisedProviders")}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Apply to become an authorised provider and join our professional
          network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className="hover:shadow-lg transition-shadow duration-200"
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(provider.status)}`}
                >
                  {provider.status}
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-primary">
                {provider.title}
              </CardTitle>
              <p className="text-sm font-medium text-gray-700">
                {provider.fullName}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">
                {provider.description}
              </p>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Requirements:
                </h4>
                <ul className="space-y-1">
                  {provider.requirements.map((req, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90"
                disabled={provider.status === "Limited Availability"}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apply Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Information */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Application Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Submit</h3>
              <p className="text-sm text-gray-600">
                Complete the online application form with required documents.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Review</h3>
              <p className="text-sm text-gray-600">
                Our team will review your application and verify credentials.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Approval</h3>
              <p className="text-sm text-gray-600">
                Receive approval and start offering authorised services.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
