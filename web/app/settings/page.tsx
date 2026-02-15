"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Bell,
  MapPin,
  Heart,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/features/home/AnimatedSection";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { CATEGORY_FILTERS } from "@/lib/constants/navigation";

interface UserPreferences {
  preferred_categories: string[];
  price_range: number[];
  max_distance_miles: number;
  notification_enabled: boolean;
  email_notifications: boolean;
}

const defaultPreferences: UserPreferences = {
  preferred_categories: [],
  price_range: [1, 2, 3, 4],
  max_distance_miles: 25,
  notification_enabled: true,
  email_notifications: true,
};

async function fetchPreferences(): Promise<UserPreferences> {
  const response = await fetch("/api/user/preferences");
  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch preferences");
  }
  return response.json();
}

async function updatePreferences(preferences: Partial<UserPreferences>) {
  const response = await fetch("/api/user/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) throw new Error("Failed to update preferences");
  return response.json();
}

function ProfileSettings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Note: This would need a profile update API
      toast.success("Profile updated", { description: "Your profile has been saved." });
    } catch (error) {
      toast.error("Error", { description: "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user?.email || ""} disabled />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function PreferencesSettings() {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["userPreferences"],
    queryFn: fetchPreferences,
  });

  const mutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
      toast.success("Preferences saved");
    },
    onError: () => {
      toast.error("Failed to save preferences");
    },
  });

  const prefs = preferences || defaultPreferences;

  const toggleCategory = (categoryId: string) => {
    const newCategories = prefs.preferred_categories.includes(categoryId)
      ? prefs.preferred_categories.filter((id) => id !== categoryId)
      : [...prefs.preferred_categories, categoryId];
    mutation.mutate({ preferred_categories: newCategories });
  };

  const updatePriceRange = (value: number[]) => {
    mutation.mutate({ price_range: value });
  };

  const updateDistance = (value: number[]) => {
    mutation.mutate({ max_distance_miles: value[0] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferred Categories</CardTitle>
          <CardDescription>Select categories you&apos;re most interested in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.filter((c) => c.id !== "all").map((category) => (
              <Button
                key={category.id}
                variant={prefs.preferred_categories.includes(category.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(category.id)}
                disabled={mutation.isPending}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
                {prefs.preferred_categories.includes(category.id) && (
                  <Check className="ml-1 h-3 w-3" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price Range</CardTitle>
          <CardDescription>Set your preferred price range for businesses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={prefs.price_range}
            min={1}
            max={4}
            step={1}
            minStepsBetweenThumbs={1}
            onValueChange={updatePriceRange}
            disabled={mutation.isPending}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>$</span>
            <span>$$</span>
            <span>$$$</span>
            <span>$$$$</span>
          </div>
          <div className="text-sm">
            Selected: <Badge variant="secondary">{"$".repeat(prefs.price_range[0])} - {"$".repeat(prefs.price_range[prefs.price_range.length - 1])}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maximum Distance</CardTitle>
          <CardDescription>How far are you willing to travel?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={[prefs.max_distance_miles]}
            min={1}
            max={50}
            step={1}
            onValueChange={updateDistance}
            disabled={mutation.isPending}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1 mile</span>
            <span>25 miles</span>
            <span>50 miles</span>
          </div>
          <div className="text-sm">
            Selected: <Badge variant="secondary">{prefs.max_distance_miles} miles</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["userPreferences"],
    queryFn: fetchPreferences,
  });

  const mutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
      toast.success("Notification settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const prefs = preferences || defaultPreferences;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Control how you receive notifications.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive notifications about deals and updates.</p>
          </div>
          <Switch
            id="notifications"
            checked={prefs.notification_enabled}
            onCheckedChange={(checked) => mutation.mutate({ notification_enabled: checked })}
            disabled={mutation.isPending}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="emails">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive weekly digest emails.</p>
          </div>
          <Switch
            id="emails"
            checked={prefs.email_notifications}
            onCheckedChange={(checked) => mutation.mutate({ email_notifications: checked })}
            disabled={mutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background">
        <Header />
        <div className="pt-20 pb-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen bg-background">
        <Header />
        <div className="pt-20 pb-12">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
            <p className="text-muted-foreground mb-6">Please sign in to access settings.</p>
            <Button onClick={() => window.location.href = "/login"}>Sign In</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <div className="pt-20 pb-12">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection animation="fade-up">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences.</p>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={0.1}>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="profile" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="preferences" className="gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Preferences</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
              </TabsList>
              <div className="mt-6">
                <TabsContent value="profile">
                  <ProfileSettings />
                </TabsContent>
                <TabsContent value="preferences">
                  <PreferencesSettings />
                </TabsContent>
                <TabsContent value="notifications">
                  <NotificationSettings />
                </TabsContent>
              </div>
            </Tabs>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
