import { useGetProject, useUpdateProject } from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const DEMO_PROJECT_ID = "demo-1";

const projectSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  location: z.string(),
  currency: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalBudget: z.coerce.number().min(0),
  productionDays: z.coerce.number().min(1),
});

export default function Settings() {
  const { data: project, isLoading, refetch } = useGetProject(DEMO_PROJECT_ID);
  const updateProject = useUpdateProject();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    values: project ? {
      name: project.name,
      type: project.type,
      location: project.location,
      currency: project.currency,
      startDate: project.startDate.split('T')[0],
      endDate: project.endDate.split('T')[0],
      totalBudget: project.totalBudget,
      productionDays: project.productionDays
    } : undefined
  });

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    try {
      await updateProject.mutateAsync({ projectId: DEMO_PROJECT_ID, data: values });
      toast({ title: "Settings Saved", description: "Project configuration updated successfully." });
      refetch();
    } catch (e) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-4xl">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">Project Settings</h1>
          <p className="text-muted-foreground font-light">Configure production details and base financial parameters.</p>
        </div>
      </div>

      <div className="border border-border bg-card p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-4">
              <h2 className="font-serif text-2xl border-b border-border pb-2">General Info</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">Production Name</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">Type</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">Primary Location</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-serif text-2xl border-b border-border pb-2">Financials & Schedule</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">Base Currency</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="totalBudget" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">Total Master Budget</FormLabel>
                  <FormControl><input type="number" {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                 <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">Start Date</FormLabel>
                  <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">End Date</FormLabel>
                  <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="productionDays" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">Total Shoot Days</FormLabel>
                  <FormControl><input type="number" {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit" 
                disabled={updateProject.isPending}
                className="bg-primary text-primary-foreground px-8 py-4 font-semibold uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {updateProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
