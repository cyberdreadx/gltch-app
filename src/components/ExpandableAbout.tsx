import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExpandableAboutProps {
  description: string;
}

export function ExpandableAbout({ description }: ExpandableAboutProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // If description is short, don't need expansion  
  const isLongDescription = description.length > 100;
  const previewText = isLongDescription ? description.slice(0, 100) + "..." : description;

  return (
    <Card className="mb-3 bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isExpanded || !isLongDescription ? description : previewText}
            </p>
          </div>
          
          {isLongDescription && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 flex-shrink-0 h-auto p-1"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        {isLongDescription && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}