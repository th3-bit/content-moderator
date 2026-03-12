export const FloatingOrbs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Primary orb */}
      <div
        className="floating-orb liquid-blob w-[500px] h-[500px] -top-48 -left-48 bg-primary/30"
        style={{ animationDelay: "0s" }}
      />
      
      {/* Secondary orb */}
      <div
        className="floating-orb liquid-blob w-[400px] h-[400px] top-1/2 -right-32 bg-secondary/25"
        style={{ animationDelay: "-5s" }}
      />
      
      {/* Accent orb */}
      <div
        className="floating-orb liquid-blob w-[350px] h-[350px] -bottom-32 left-1/4 bg-accent/25"
        style={{ animationDelay: "-10s" }}
      />
      
      {/* Small accent orbs */}
      <div
        className="floating-orb w-[150px] h-[150px] top-1/4 right-1/4 bg-primary/20 rounded-full"
        style={{ animationDelay: "-7s", animationDuration: "15s" }}
      />
      <div
        className="floating-orb w-[100px] h-[100px] bottom-1/4 left-1/3 bg-secondary/20 rounded-full"
        style={{ animationDelay: "-12s", animationDuration: "18s" }}
      />
    </div>
  );
};
