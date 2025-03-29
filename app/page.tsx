import { PostGeneratorForm } from "@/components/forms/PostGeneratorForm";

export default function Home() {
  return (
    <main className="min-h-screen py-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">LinkedIn Post Generator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create engaging, professional LinkedIn posts tailored to your audience and goals
          </p>
        </div>
        
        <PostGeneratorForm />
      </div>
    </main>
  );
}