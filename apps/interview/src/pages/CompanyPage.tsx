import { useState, useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  ExternalLink,
  Filter,
  X,
  MousePointerClick,
  Building2,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { Question, InterviewMode } from '@/types';

interface JobSource {
  company: string;
  sourceName: string;
  sourceUrl?: string;
  evidenceUrl?: string;
  firstSeenAt?: string;
  snapshotDate?: string;
  status?: string;
  note?: string;
}

interface CompanyJob {
  id: string;
  title: string;
  salary: string;
  location: string;
  level: string;
  tags: string[];
  description: string;
  source?: JobSource;
  questionCategories?: string[];
  questionFocus?: string[];
}

interface Company {
  id: string;
  name: string;
  logo: string;
  description: string;
  color: string;
  gradient: string;
  jobs: CompanyJob[];
  questionCount: number;
}

interface Props {
  companies: Company[];
  generalQuestions: Record<string, Question[]>;
  companyQuestions: Record<string, Question[]>;
  interviewModes: InterviewMode[];
}

function QuestionCard({
  q,
  index,
  categoryLabel,
}: {
  q: Question;
  index: number;
  categoryLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="rounded-xl border border-[#1E293B] bg-[#151D2B] p-5 transition-all duration-300 hover:border-[rgba(14,165,233,0.28)]"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-[rgba(14,165,233,0.1)] px-2 py-0.5 text-[10px] font-medium text-[#0EA5E9]">
              {categoryLabel}
            </span>
            <span className="text-[10px] text-[#64748B]">#{q.number}</span>
          </div>
          <h3 className="font-heading text-sm font-semibold leading-snug text-[#F8FAFC] md:text-base">
            <MarkdownRenderer content={q.title} />
          </h3>
        </div>
      </div>

      <div className="mb-4 text-sm leading-relaxed text-[#94A3B8]">
        <MarkdownRenderer content={q.question} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-3 flex items-center gap-1.5 text-sm text-[#0EA5E9] transition-colors hover:text-[#06B6D4]"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? '收起答案' : '查看答案'}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="mb-3 rounded-xl bg-[#111827] p-5">
            <h4 className="mb-3 text-xs font-medium text-[#10B981]">参考答案</h4>
            <div className="text-sm leading-loose text-[#94A3B8]">
              <MarkdownRenderer content={q.answer} />
            </div>
          </div>

          {q.followUp && (
            <div className="rounded-xl border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.05)] p-5">
              <h4 className="mb-2 text-xs font-medium text-[#F59E0B]">追问</h4>
              <div className="text-sm leading-loose text-[#94A3B8]">
                <MarkdownRenderer content={q.followUp} />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function CompanyPage({ companies, generalQuestions, companyQuestions, interviewModes }: Props) {
  const { companyId } = useParams<{ companyId: string }>();
  const [activeCategory, setActiveCategory] = useState('all');
  const [displayCount, setDisplayCount] = useState(30);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const questionsRef = useRef<HTMLDivElement>(null);

  const company = companies.find(c => c.id === companyId);
  const modeNameById = useMemo(
    () => Object.fromEntries(interviewModes.map(mode => [mode.id, mode.name])),
    [interviewModes],
  );

  useEffect(() => {
    setActiveCategory('all');
    setDisplayCount(30);
    setSelectedJobId(null);
    window.scrollTo(0, 0);
  }, [companyId]);

  const allQuestions = useMemo(() => {
    if (!company) return [];
    const qs: Question[] = [];

    if (company.id === 'deepseek') {
      Object.values(generalQuestions).forEach(arr => qs.push(...arr));
    } else {
      const companySpecific = companyQuestions[company.id] || [];
      qs.push(...companySpecific);
    }

    return qs;
  }, [company, generalQuestions, companyQuestions]);

  const selectedJob = useMemo(() => {
    if (!company || !selectedJobId) return null;
    return company.jobs.find(job => job.id === selectedJobId) || null;
  }, [company, selectedJobId]);

  const jobScopedQuestions = useMemo(() => {
    const relatedCategories = selectedJob?.questionCategories || [];
    if (!relatedCategories.length) return allQuestions;
    return allQuestions.filter(q => relatedCategories.includes(q.category));
  }, [allQuestions, selectedJob]);

  const filteredQuestions = useMemo(() => {
    if (activeCategory === 'all') return jobScopedQuestions;
    return jobScopedQuestions.filter(q => q.category === activeCategory);
  }, [activeCategory, jobScopedQuestions]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobScopedQuestions.length };
    interviewModes.forEach(mode => {
      counts[mode.id] = jobScopedQuestions.filter(q => q.category === mode.id).length;
    });
    return counts;
  }, [jobScopedQuestions, interviewModes]);

  const visibleModes = useMemo(() => {
    if (!selectedJob) return interviewModes;
    return interviewModes.filter(mode => (categoryCounts[mode.id] || 0) > 0);
  }, [categoryCounts, interviewModes, selectedJob]);

  const paginatedQuestions = filteredQuestions.slice(0, displayCount);
  const hasMore = displayCount < filteredQuestions.length;

  const selectJob = (job: CompanyJob) => {
    const nextJobId = selectedJobId === job.id ? null : job.id;
    setSelectedJobId(nextJobId);
    setActiveCategory('all');
    setDisplayCount(30);

    if (nextJobId) {
      window.requestAnimationFrame(() => {
        questionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const clearJobFilter = () => {
    setSelectedJobId(null);
    setActiveCategory('all');
    setDisplayCount(30);
  };

  const onJobKeyDown = (event: KeyboardEvent<HTMLElement>, job: CompanyJob) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectJob(job);
    }
  };

  if (!company) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0B0F1A]">
        <div className="text-center">
          <p className="mb-4 text-[#94A3B8]">公司未找到</p>
          <Link to="/" className="text-sm text-[#0EA5E9] hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const companyColor = company.color;

  return (
    <div className="min-h-[100dvh] bg-[#0B0F1A]">
      <section
        className="relative overflow-hidden pb-12 pt-16"
        style={{ background: `linear-gradient(135deg, #0B0F1A 0%, ${companyColor}15 50%, #0B0F1A 100%)` }}
      >
        <div className="mx-auto max-w-[1280px] px-6 pt-12">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#0EA5E9]"
          >
            <ArrowLeft size={14} />
            返回首页
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-4 flex items-center gap-4">
              <span className="text-5xl">{company.logo}</span>
              <div>
                <h1 className="font-display text-[28px] font-bold text-[#F8FAFC] md:text-[40px]">
                  {company.name}
                </h1>
                <p className="text-sm text-[#94A3B8]">{company.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Briefcase size={14} className="text-[#0EA5E9]" />
                <span>{company.jobs.length} 个岗位</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <BookOpen size={14} className="text-[#0EA5E9]" />
                <span>{company.questionCount} 道面试题</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#0B0F1A] py-8">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
          >
            <div>
              <h2 className="font-display text-xl font-semibold text-[#F8FAFC] md:text-2xl">招聘岗位</h2>
              <p className="mt-2 text-sm text-[#94A3B8]">点击岗位卡片，题库会自动切到对应面试维度。</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1E293B] px-3 py-1.5 text-xs text-[#94A3B8]">
              <MousePointerClick size={13} className="text-[#0EA5E9]" />
              岗位绑定题库
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {company.jobs.map((job, i) => {
              const isSelected = selectedJobId === job.id;
              const sourceUrl = job.source?.sourceUrl || job.source?.evidenceUrl;
              const relatedLabels = (job.questionCategories || []).map(id => modeNameById[id] || id);

              return (
                <motion.article
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectJob(job)}
                  onKeyDown={event => onJobKeyDown(event, job)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className={`cursor-pointer rounded-xl border p-5 text-left transition-all ${
                    isSelected
                      ? 'border-[#0EA5E9] bg-[rgba(14,165,233,0.12)] shadow-[0_0_0_1px_rgba(14,165,233,0.22)]'
                      : 'border-[#1E293B] bg-[#151D2B] hover:border-[rgba(14,165,233,0.35)]'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-heading text-base font-semibold text-[#F8FAFC]">{job.title}</h3>
                      <div className="mt-2 flex items-center gap-1 text-xs text-[#64748B]">
                        <MapPin size={12} />
                        {job.location}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-[rgba(14,165,233,0.1)] px-2 py-0.5 text-[10px] font-medium text-[#0EA5E9]">
                      {job.level}
                    </span>
                  </div>

                  <p className="mb-3 text-xs leading-relaxed text-[#94A3B8]">{job.description}</p>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {job.tags.map(tag => (
                      <span key={tag} className="rounded-md bg-[rgba(14,165,233,0.08)] px-2 py-0.5 text-[10px] text-[#06B6D4]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {job.source && (
                    <div className="mb-3 grid gap-2 rounded-lg border border-[#1E293B] bg-[#0B1220] p-3 text-[11px] text-[#94A3B8] sm:grid-cols-3">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} className="text-[#38BDF8]" />
                        {job.source.firstSeenAt ? `起始 ${job.source.firstSeenAt}` : '起始待核验'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={12} className="text-[#38BDF8]" />
                        {job.source.company}
                      </span>
                      {sourceUrl ? (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={event => event.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[#38BDF8] hover:text-[#7DD3FC]"
                        >
                          {job.source.sourceName}
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span>{job.source.sourceName}</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-medium text-[#F59E0B]">{job.salary}</div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0B1220] px-3 py-1 text-[11px] text-[#94A3B8]">
                      <Filter size={12} className={isSelected ? 'text-[#0EA5E9]' : 'text-[#64748B]'} />
                      {relatedLabels.length ? `${relatedLabels.length} 个题库维度` : '查看岗位题目'}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={questionsRef} className="bg-[#0B0F1A] py-8">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display mb-2 text-xl font-semibold text-[#F8FAFC] md:text-2xl">面试真题</h2>
            <p className="mb-6 text-sm text-[#94A3B8]">
              共 {jobScopedQuestions.length} 道{company.id !== 'deepseek' ? '公司专项' : ''}面试题
            </p>
          </motion.div>

          {selectedJob && (
            <div className="mb-5 rounded-xl border border-[rgba(14,165,233,0.28)] bg-[rgba(14,165,233,0.08)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#7DD3FC]">
                    <Filter size={15} />
                    已按岗位筛选：{selectedJob.title}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedJob.questionFocus || []).map(item => (
                      <span key={item} className="rounded-md bg-[#0B1220] px-2 py-1 text-[11px] text-[#CBD5E1]">
                        {item}
                      </span>
                    ))}
                    {(selectedJob.questionCategories || []).map(id => (
                      <span key={id} className="rounded-md bg-[rgba(16,185,129,0.12)] px-2 py-1 text-[11px] text-[#34D399]">
                        {modeNameById[id] || id}
                      </span>
                    ))}
                  </div>
                  {selectedJob.source?.note && (
                    <p className="mt-3 text-xs text-[#94A3B8]">{selectedJob.source.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearJobFilter}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#1E293B] px-3 py-2 text-sm text-[#CBD5E1] transition-colors hover:border-[#38BDF8] hover:text-[#7DD3FC]"
                >
                  <X size={14} />
                  清除筛选
                </button>
              </div>
            </div>
          )}

          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setDisplayCount(30);
              }}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeCategory === 'all'
                  ? 'border-b-2 border-[#0EA5E9] bg-[rgba(14,165,233,0.15)] text-[#0EA5E9]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              全部 ({categoryCounts.all || 0})
            </button>
            {visibleModes.map(mode => (
              <button
                type="button"
                key={mode.id}
                onClick={() => {
                  setActiveCategory(mode.id);
                  setDisplayCount(30);
                }}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === mode.id
                    ? 'border-b-2 border-[#0EA5E9] bg-[rgba(14,165,233,0.15)] text-[#0EA5E9]'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                {mode.name} ({categoryCounts[mode.id] || 0})
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {paginatedQuestions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} categoryLabel={modeNameById[q.category] || q.category} />
            ))}

            {filteredQuestions.length === 0 && (
              <div className="py-12 text-center text-[#64748B]">未找到匹配的面试题</div>
            )}

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setDisplayCount(prev => prev + 30)}
                  className="flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#151D2B] px-6 py-2.5 text-sm text-[#94A3B8] transition-all hover:border-[rgba(14,165,233,0.4)] hover:text-[#0EA5E9]"
                >
                  加载更多 ({filteredQuestions.length - displayCount} 道剩余)
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
