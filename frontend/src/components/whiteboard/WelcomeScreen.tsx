import { Action } from "@radix-ui/react-toast";
import { ArrowUpLeft, ArrowUp, Move, MousePointer2 } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 select-none">
      {/* Menu Tip (Top Left) */}
      <div className="absolute top-20 left-12 flex flex-col items-start opacity-70 animate-in fade-in duration-700 delay-150">
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          className="ml-2 mb-2 stroke-muted-foreground"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 40 90 Q 15 60 10 20"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M 10 20 L 25 25 M 10 20 L 5 35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-hand text-muted-foreground text-lg max-w-[150px] leading-tight">
          Export, preferences, languages, ...
        </span>
      </div>

      {/* Toolbar Tip (Top Center) */}
      <div className="absolute top-24 left-1/2 flex items-start -translate-x-1/2 opacity-70 animate-in fade-in duration-700 delay-300">
        <div className="text-right font-hand text-muted-foreground mr-4 mt-12">
          <p className="text-lg">Pick a tool &</p>
          <p className="text-lg">Start drawing!</p>
        </div>
        <svg
          width="60"
          height="80"
          viewBox="0 0 60 80"
          className="stroke-muted-foreground"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 10 70 Q 30 60 45 10"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M 45 10 L 35 22 M 45 10 L 52 18"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Center Text */}
      <div className="flex flex-col items-center gap-6 opacity-60 animate-in fade-in duration-1000 delay-500">
        <h2 className="font-hand text-3xl md:text-3xl text-muted-foreground/80 text-center px-4">
          All your data is saved locally in your browser.
        </h2>
      </div>

       {/* Navigation/Shortcuts Tip (Bottom Center/Right) */}
       {/* Use a subtle position, maybe slightly below center */}
      <div className="absolute bottom-1/4 flex flex-col items-center opacity-50 animate-in fade-in duration-1000 delay-700">
         <span className="font-hand text-muted-foreground text-lg text-center">
             To move canvas, hold <span className="border border-muted-foreground/30 px-1 rounded mx-0.5 text-sm font-sans">Scroll Wheel</span> or <span className="border border-muted-foreground/30 px-1 rounded mx-0.5 text-sm font-sans">Space</span> while dragging
         </span>
      </div>
    </div>
  );
}
