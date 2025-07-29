"use client";
import React, { useEffect, useState } from "react";
import { userAPI, UserProfile, initializeAuth } from "@/lib/api";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Target,
  BookOpen,
  Building,
  TrendingUp,
  CheckCircle,
  Clock,
  Star,
  Users,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const hasAuth = initializeAuth();

        if (!hasAuth) {
          toast.error("Authentication Required", {
            description: "Please log in to access your dashboard",
          });
          setLoading(false);
          return;
        }

        const response = await userAPI.getProfile();
        console.log("User profile response:", response);

        if (response.status === "success" && response.data) {
          setUserProfile(response.data);
          toast.success("Profile loaded successfully!");
        } else {
          if (response.message === "Authorization header required") {
            toast.error("Authentication Error", {
              description: "Please log in again to access your dashboard",
            });
          } else if (
            response.message === "Invalid token" ||
            response.error === "token is expired"
          ) {
            toast.error("Session Expired", {
              description: "Your session has expired. Please log in again",
            });

            localStorage.removeItem("authToken");
            router.push("/");
          } else {
            toast.error("Failed to load profile", {
              description: response.message || "Something went wrong",
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast.error("Network Error", {
          description: "Unable to connect to server. Please try again",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const userName = userProfile?.profile?.full_name || "User";
  const careerPath = userProfile?.profile?.headline || "Full Stack Developer";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Continue your journey to become a {careerPath}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DailyTasksComponent />
            <LearningRoadmapComponent />
          </div>

          <div className="space-y-6">
            <ProgressTrackerComponent userProfile={userProfile} />
            <TopCompaniesComponent />
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyTasksComponent() {
  const dailyTasks = [
    {
      id: 1,
      title: "Complete React Hooks Tutorial",
      description: "Learn useState and useEffect hooks",
      points: 50,
      completed: false,
      deadline: "Today",
      category: "Frontend",
    },
    {
      id: 2,
      title: "Build REST API with Node.js",
      description: "Create CRUD operations for user management",
      points: 100,
      completed: true,
      deadline: "Yesterday",
      category: "Backend",
    },
    {
      id: 3,
      title: "Practice SQL Queries",
      description: "Complete 10 intermediate SQL problems",
      points: 75,
      completed: false,
      deadline: "Tomorrow",
      category: "Database",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Daily Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dailyTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all hover:shadow-sm ${
                task.completed
                  ? "bg-accent/20 border-accent"
                  : "bg-card border-border hover:border-accent/50"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {task.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div>
                    <h4
                      className={`font-medium ${
                        task.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{task.points} pts</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline">{task.category}</Badge>
                <span className="text-muted-foreground">{task.deadline}</span>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4" variant="outline">
          View All Tasks
        </Button>
      </CardContent>
    </Card>
  );
}

// Learning Roadmap Component
function LearningRoadmapComponent() {
  const roadmapItems = [
    {
      phase: "Foundation",
      progress: 100,
      topics: ["HTML/CSS", "JavaScript Basics", "Git"],
      completed: true,
    },
    {
      phase: "Frontend Development",
      progress: 75,
      topics: ["React", "TypeScript", "State Management"],
      completed: false,
    },
    {
      phase: "Backend Development",
      progress: 40,
      topics: ["Node.js", "Express", "Database Design"],
      completed: false,
    },
    {
      phase: "DevOps & Deployment",
      progress: 0,
      topics: ["Docker", "CI/CD", "Cloud Platforms"],
      completed: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Learning Roadmap - Full Stack Developer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {roadmapItems.map((item, index) => (
            <div key={index} className="relative">
              {index !== roadmapItems.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-16 bg-border" />
              )}
              <div className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.completed
                      ? "bg-green-500 text-white"
                      : item.progress > 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground mb-1">
                    {item.phase}
                  </h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.topics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="text-xs"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={item.progress} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground w-10">
                      {item.progress}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4">Continue Learning</Button>
      </CardContent>
    </Card>
  );
}
function ProgressTrackerComponent({
  userProfile,
}: {
  userProfile: UserProfile | null;
}) {
  const progress = {
    overall: 75,
    technical_skills: 85,
    project_experience: 70,
    industry_knowledge: 60,
  };

  const tasks = {
    completed: 12,
    total: 20,
  };

  const points = 850;
  const careerPath = userProfile?.profile?.headline || "Full Stack Developer";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-1">
              {progress.overall}%
            </div>
            <p className="text-sm text-muted-foreground">
              {careerPath} Journey
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Technical Skills</span>
                <span>{progress.technical_skills}%</span>
              </div>
              <Progress value={progress.technical_skills} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Project Experience</span>
                <span>{progress.project_experience}%</span>
              </div>
              <Progress value={progress.project_experience} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Industry Knowledge</span>
                <span>{progress.industry_knowledge}%</span>
              </div>
              <Progress value={progress.industry_knowledge} className="h-2" />
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-foreground">
                  {tasks.completed}
                </div>
                <div className="text-xs text-muted-foreground">
                  Tasks Completed
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">
                  {points}
                </div>
                <div className="text-xs text-muted-foreground">
                  Points Earned
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopCompaniesComponent() {
  const companies = [
    {
      name: "Google",
      logo: "/company-logos/google.png",
      match: 95,
      openRoles: 12,
      location: "Remote",
      rating: 4.8,
    },
    {
      name: "Microsoft",
      logo: "/company-logos/microsoft.png",
      match: 90,
      openRoles: 8,
      location: "Seattle",
      rating: 4.7,
    },
    {
      name: "Netflix",
      logo: "/company-logos/netflix.png",
      match: 88,
      openRoles: 5,
      location: "Remote",
      rating: 4.6,
    },
    {
      name: "Spotify",
      logo: "/company-logos/spotify.png",
      match: 85,
      openRoles: 3,
      location: "Stockholm",
      rating: 4.5,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Top Companies for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {companies.map((company) => (
            <div
              key={company.name}
              className="p-3 rounded-lg border border-border hover:border-accent/50 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {company.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {company.location}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {company.match}% match
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {company.openRoles} open roles
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {company.rating}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4" variant="outline">
          View All Companies
        </Button>
      </CardContent>
    </Card>
  );
}
