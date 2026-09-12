import { useGetProject, useUpdateProject } from "@workspace/api-client-react";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useActiveProject } from "@/lib/project-context";
import { useTranslation } from "@/lib/i18n";

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
  const { projectId, isLoading: isProjectLoading, refetchProjects } = useActiveProject();
  const { data: project, isLoading, refetch } = useGetProject(projectId ?? "");
  const updateProject = useUpdateProject();
  const { toast } = useToast();
  const { t } = useTranslation();

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
    } : {
      name: "",
      type: "",
      location: "",
      currency: "",
      startDate: "",
      endDate: "",
      totalBudget: 0,
      productionDays: 1,
    }
  });

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!projectId) return;
    try {
      await updateProject.mutateAsync({ projectId, data: values });
      toast({ title: t("settings.savedTitle"), description: t("settings.savedDesc") });
      await refetch();
      await refetchProjects();
    } catch (e) {
      toast({ title: t("settings.errorTitle"), description: t("settings.errorDesc"), variant: "destructive" });
    }
  };

  if (isProjectLoading || isLoading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-4xl">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-4xl mb-2">{t("settings.title")}</h1>
          <p className="text-muted-foreground font-light">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="border border-border bg-card p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-4">
              <h2 className="font-serif text-2xl border-b border-border pb-2">{t("settings.generalInfo")}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.prodName")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.type")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.primaryLoc")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-serif text-2xl border-b border-border pb-2">{t("settings.financials")}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.currency")}</FormLabel>
                  <FormControl><input {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="totalBudget" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.totalBudget")}</FormLabel>
                  <FormControl><input type="number" {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                 <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.startDate")}</FormLabel>
                  <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.endDate")}</FormLabel>
                  <FormControl><input type="date" {...field} className="w-full bg-input border-border border p-3 rounded-none focus:outline-none focus:border-primary" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="productionDays" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase tracking-widest">{t("settings.shootDays")}</FormLabel>
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
                {t("settings.saveConfig")}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
