import type { Entry } from "@/lib/entries";
import { SubmitButton } from "@/components/submit-button";

export function EntryForm({
  action,
  entry,
}: {
  action: (formData: FormData) => void | Promise<void>;
  entry?: Entry;
}) {
  return (
    <form action={action} className="mt-12 max-w-5xl space-y-5">
      <FormSection
        number="01"
        title="基本信息"
        description="设置这篇图文在首页和详情页中显示的名称与简介。"
      >
        <div className="grid gap-7 md:grid-cols-2">
          <Field
            label="标题"
            required
            hint="建议控制在 20 个字以内"
          >
            <input
              name="title"
              required
              defaultValue={entry?.title}
              className="admin-input"
              placeholder="例如：雨停之后"
            />
          </Field>

          <Field
            label="网址标识"
            required
            hint="仅限小写英文、数字和连字符，发布后不建议修改"
          >
            <div className="admin-input-prefix">
              <span>/entry/</span>
              <input
                name="slug"
                required
                defaultValue={entry?.slug}
                placeholder="after-the-rain"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                title="仅使用小写字母、数字和连字符"
              />
            </div>
          </Field>
        </div>

        <Field
          label="摘要"
          required
          hint="这段文字会显示在首页卡片中，建议 40–80 字"
        >
          <textarea
            name="summary"
            required
            defaultValue={entry?.summary}
            className="admin-input min-h-28 resize-y"
            placeholder="用一两句话概括这篇内容……"
          />
        </Field>
      </FormSection>

      <FormSection
        number="02"
        title="内容与封面"
        description="正文用空行分段；封面照片会被安全地保存到私有空间。"
      >
        <Field
          label="正文"
          required
          hint="段落之间请留一个空行，显示时会自动保留段落结构"
        >
          <textarea
            name="body"
            required
            defaultValue={entry?.body}
            className="admin-input min-h-[22rem] resize-y leading-7"
            placeholder={"写下第一段文字……\n\n空一行后开始新的段落。"}
          />
        </Field>

        <Field
          label={entry?.image_path ? "更换封面照片" : "封面照片"}
          required={!entry?.image_path}
          hint={
            entry?.image_path
              ? "不选择新文件将继续使用当前封面"
              : "建议使用横向照片，JPG、PNG、WebP 或 GIF，最大 10 MB"
          }
        >
          <label className="admin-upload">
            <span className="admin-upload-icon">＋</span>
            <span className="admin-upload-copy">
              <strong>{entry?.image_path ? "选择新照片" : "选择封面照片"}</strong>
              <small>点击浏览本地文件</small>
            </span>
            <input
              name="image"
              type="file"
              required={!entry?.image_path}
              accept="image/jpeg,image/png,image/webp,image/gif"
            />
          </label>
        </Field>
      </FormSection>

      <FormSection
        number="03"
        title="发布设置"
        description="决定成员现在是否可以看到这篇内容。"
      >
        <label className="admin-publish-option">
          <input
            name="published"
            type="checkbox"
            defaultChecked={entry?.published ?? true}
          />
          <span className="admin-toggle" aria-hidden="true">
            <span />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">立即发布给所有成员</span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              取消勾选将保存为草稿。草稿只会出现在管理后台，不会显示在首页。
            </span>
          </span>
        </label>
      </FormSection>

      <div className="flex flex-col-reverse gap-4 border-t hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-5 text-muted">
          标有 <span className="text-[#8c453a]">*</span> 的项目必须填写
        </p>
        <SubmitButton pendingText={entry ? "正在保存…" : "正在发布…"}>
          {entry ? "保存全部修改" : "创建并保存图文"}
        </SubmitButton>
      </div>
    </form>
  );
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="admin-section">
      <legend className="sr-only">{title}</legend>
      <div className="admin-section-heading">
        <span className="admin-section-number">{number}</span>
        <div>
          <h2 className="font-serif text-3xl tracking-tight">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        </div>
      </div>
      <div className="admin-section-content">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="flex items-baseline justify-between gap-5">
        <span className="text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-[#8c453a]">*</span>}
        </span>
        {hint && (
          <span className="max-w-sm text-right text-[10px] leading-4 text-muted">
            {hint}
          </span>
        )}
      </span>
      {children}
    </div>
  );
}
