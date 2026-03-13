import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center p-8">
        <h1 className="text-3xl font-arcade text-neon-green mb-4">JUMP BIRD GAME</h1>
        <p className="text-sm font-display text-muted-foreground mb-8">
          JUMP JUMP JUMP!!
        </p>
        <button
          onClick={() => navigate('/webview/games/flappy?table_name=demo')}
          className="font-arcade text-xs bg-primary text-primary-foreground px-8 py-4 rounded-lg glow-green hover:scale-105 transition-transform">
          
          PLAY NOW
        </button>
      </div>
    </div>);

};

export default Index;