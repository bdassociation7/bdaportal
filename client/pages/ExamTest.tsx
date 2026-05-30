import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
} from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  type: "single-choice";
}

export default function ExamTest() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  // Sample questions - in real app this would come from API
  const questions: Question[] = [
    {
      id: 1,
      question:
        "What is the primary purpose of professional training in the workplace?",
      options: [
        "To increase employee satisfaction only",
        "To develop skills, knowledge, and competencies for improved performance",
        "To reduce operational costs",
        "To comply with government regulations only",
      ],
      correctAnswer: 1,
      type: "single-choice",
    },
    {
      id: 2,
      question:
        "Which of the following is NOT a characteristic of effective training?",
      options: [
        "Clear learning objectives",
        "Interactive and engaging content",
        "One-size-fits-all approach",
        "Regular assessment and feedback",
      ],
      correctAnswer: 2,
      type: "single-choice",
    },
    {
      id: 3,
      question: "What is the difference between training and development?",
      options: [
        "Training is for managers, development is for employees",
        "Training focuses on current job skills, development focuses on future growth",
        "Training is expensive, development is cost-effective",
        "There is no difference between training and development",
      ],
      correctAnswer: 1,
      type: "single-choice",
    },
    {
      id: 4,
      question:
        "Which training method is most suitable for teaching complex procedures?",
      options: [
        "Lecture-based training only",
        "Reading materials only",
        "Hands-on practical training with supervision",
        "Online videos without interaction",
      ],
      correctAnswer: 2,
      type: "single-choice",
    },
    {
      id: 5,
      question: "What is the ADDIE model in training design?",
      options: [
        "A certification program",
        "A systematic approach: Analyse, Design, Develop, Implement, Evaluate",
        "A type of learning management system",
        "A government training standard",
      ],
      correctAnswer: 1,
      type: "single-choice",
    },
    // Add more questions to reach 50
    ...Array.from({ length: 45 }, (_, i) => ({
      id: i + 6,
      question: `Sample question ${i + 6}: This is a practice question to demonstrate the exam interface. What would be the best approach to handle this scenario?`,
      options: [
        `Option A for question ${i + 6}`,
        `Option B for question ${i + 6}`,
        `Option C for question ${i + 6}`,
        `Option D for question ${i + 6}`,
      ],
      correctAnswer: Math.floor(Math.random() * 4),
      type: "single-choice" as const,
    })),
  ];

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleQuestionNavigation = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
  };

  const handleFinishExam = useCallback(() => {
    // Calculate results
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 100);

    // Navigate to results page with score
    navigate(`/dashboard/exam/${examId}/results`, {
      state: {
        score,
        correctAnswers,
        totalQuestions: questions.length,
        timeSpent: 3600 - timeLeft,
        answers,
      },
    });
  }, [answers, examId, navigate, questions, timeLeft]);

  const getQuestionStatus = (index: number) => {
    return answers.hasOwnProperty(index) ? "answered" : "unanswered";
  };

  const currentQuestionData = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Professional Training Fundamentals - Practice Test
            </h1>
            <p className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {questions.length} •{" "}
              {currentQuestionData.type}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-primary" />
              <span
                className={`${timeLeft < 300 ? "text-red-600" : "text-gray-900"}`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
            <Button
              onClick={handleNextQuestion}
              disabled={currentQuestion >= questions.length - 1}
              className="bg-primary hover:bg-primary/90"
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              {t("mockExams.nextQuestion")}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-medium">
                  Question {currentQuestion + 1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-auto max-h-96 mb-6">
                  <p className="text-lg text-gray-900 leading-relaxed">
                    {currentQuestionData.question}
                  </p>
                </ScrollArea>

                {/* Answer Options */}
                <RadioGroup
                  value={answers[currentQuestion]?.toString() || ""}
                  onValueChange={(value) =>
                    handleAnswerChange(currentQuestion, parseInt(value))
                  }
                  className="space-y-4"
                >
                  {currentQuestionData.options.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                    >
                      <RadioGroupItem
                        value={index.toString()}
                        id={`option-${index}`}
                      />
                      <Label
                        htmlFor={`option-${index}`}
                        className="text-base leading-relaxed cursor-pointer flex-1"
                      >
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <Button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestion === 0}
                    variant="outline"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={currentQuestion >= questions.length - 1}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Panel */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Timer Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Remaining
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold text-center ${timeLeft < 300 ? "text-red-600" : "text-primary"}`}
                  >
                    {formatTime(timeLeft)}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Save progress functionality
                    console.log("Progress saved");
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("mockExams.continueLater")}
                </Button>
                <Dialog
                  open={showFinishDialog}
                  onOpenChange={setShowFinishDialog}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full bg-secondary hover:bg-secondary/90">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t("mockExams.finishTest")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Finish Exam</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to finish the exam? You have
                        answered {Object.keys(answers).length} out of{" "}
                        {questions.length} questions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowFinishDialog(false)}
                      >
                        Continue Exam
                      </Button>
                      <Button
                        onClick={handleFinishExam}
                        className="bg-secondary hover:bg-secondary/90"
                      >
                        Finish Exam
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Question Grid */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">
                    Question Navigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-1">
                    {questions.map((_, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuestionNavigation(index)}
                        className={`h-8 w-8 p-0 text-xs ${
                          index === currentQuestion
                            ? "bg-primary text-white border-primary"
                            : getQuestionStatus(index) === "answered"
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-gray-900 border-gray-300"
                        }`}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-3 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                      <span>Not answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-600 rounded"></div>
                      <span>Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded"></div>
                      <span>Current</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">
                    {t("mockExams.notes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add your notes here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-32 resize-none"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
