import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, MapPin, Save, X } from "lucide-react";
import { US_STATES } from "@/lib/usStates";
import { isValidName } from "@/lib/profanityFilter";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  firstName: string;
  state: string;
  city: string;
}

const PROFILE_STORAGE_KEY = "curbball_profile";

// eslint-disable-next-line react-refresh/only-export-components
export const getProfile = (): UserProfile | null => {
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
};

// eslint-disable-next-line react-refresh/only-export-components
export const saveProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

interface ProfileModalProps {
  onClose: () => void;
  onSave?: (profile: UserProfile) => void;
}

export const ProfileModal = ({ onClose, onSave }: ProfileModalProps) => {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setFirstName(profile.firstName);
      setState(profile.state);
      setCity(profile.city);
    }
  }, []);

  const validateName = (name: string) => {
    const result = isValidName(name);
    setNameError(result.valid ? null : result.error || null);
    return result.valid;
  };

  const validateCity = (cityName: string) => {
    const trimmed = cityName.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      setCityError("City must be at least 2 characters");
      return false;
    }
    if (trimmed.length > 50) {
      setCityError("City must be 50 characters or less");
      return false;
    }
    if (trimmed.length > 0 && !/^[a-zA-Z\s'-]+$/.test(trimmed)) {
      setCityError("City can only contain letters, spaces, hyphens, and apostrophes");
      return false;
    }
    setCityError(null);
    return true;
  };

  const handleSave = () => {
    const isNameValid = validateName(firstName);
    const isCityValid = validateCity(city);

    if (!isNameValid || !isCityValid) {
      return;
    }

    const profile: UserProfile = {
      firstName: firstName.trim(),
      state,
      city: city.trim()
    };

    saveProfile(profile);
    
    toast({
      title: "Profile Saved!",
      description: "Your profile has been updated.",
    });

    onSave?.(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Profile
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* First Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              First Name *
            </label>
            <Input
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={() => validateName(firstName)}
              className={nameError ? "border-destructive" : ""}
              maxLength={20}
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>

          {/* State */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              State
            </label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger>
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              City
            </label>
            <Input
              placeholder="Enter your city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (cityError) validateCity(e.target.value);
              }}
              onBlur={() => validateCity(city)}
              className={cityError ? "border-destructive" : ""}
              maxLength={50}
            />
            {cityError && (
              <p className="text-xs text-destructive">{cityError}</p>
            )}
          </div>

          <Button 
            onClick={handleSave} 
            className="w-full gap-2"
            disabled={!firstName.trim()}
          >
            <Save className="h-4 w-4" />
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
