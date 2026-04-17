# تقرير التحقق من مشكلة عرض الاسم وتأثيرها على الشهادات

بناءً على مراجعة الكود المتاح في مستودع `bdaportal`، قمت بالتحقق من المشكلة الموصوفة المتعلقة بعرض البريد الإلكتروني بدلاً من الاسم بعد إكمال الملف الشخصي، وتأثير ذلك على تدفق تنزيل الشهادة لمرة واحدة.

فيما يلي إجابات مفصلة على الأسئلة المطروحة بناءً على الكود الحالي:

## 1. هل لا يزال النظام يستخدم البريد الإلكتروني كاسم عرض حتى بعد إكمال الملف الشخصي؟
**نعم، المشكلة موجودة في الواجهة الأمامية.**
في ملفات التخطيط الرئيسية مثل `DashboardLayout.tsx` و `PortalLayout.tsx`، يتم عرض اسم المستخدم باستخدام المنطق التالي:
```typescript
{user?.profile?.first_name && user?.profile?.last_name
  ? `${user.profile.first_name} ${user.profile.last_name}`
  : user?.email || 'BDA Member'}
```
المشكلة تكمن في أن حالة `user.profile` قد لا يتم تحديثها بشكل صحيح أو فوري في جميع مكونات التطبيق بعد إكمال الملف الشخصي، مما يؤدي إلى استمرار عرض البريد الإلكتروني كإجراء احتياطي (Fallback).

## 2. هل يتم جلب الاسم الكامل المحدث بشكل صحيح بعد حفظ الملف الشخصي؟
**يوجد خلل محتمل في تدفق التحديث.**
في صفحة `CompleteProfile.tsx`، بعد حفظ البيانات بنجاح باستخدام `UsersService.updateUser`، يتم استدعاء دالة `checkAuth()` لتحديث حالة المستخدم:
```typescript
const result = await UsersService.updateUser(user!.profile!.id, { ...formData, profile_completed: true });
// ...
await checkAuth();
```
ومع ذلك، دالة `checkAuth` في `useAuth.ts` تقوم بجلب المستخدم الحالي باستخدام `AuthService.getCurrentUser()` ثم تستدعي `loadUserProfile(user)`. دالة `loadUserProfile` تعتمد على استعلام قاعدة البيانات (من `users_with_details` أو `users`). إذا كان هناك تأخير في التحديث (Replication lag) أو مشكلة في التخزين المؤقت (Caching)، فقد تعيد `checkAuth` البيانات القديمة. بالإضافة إلى ذلك، قد لا يتم إعادة تصيير (Re-render) جميع المكونات التي تعتمد على `user.profile` بشكل صحيح إذا لم يتم تحديث السياق (Context) بشكل كامل.

## 3. هل تستخدم نافذة تأكيد الشهادة المنبثقة الاسم المحدث الصحيح؟
**نعم، المشكلة تؤثر بشكل مباشر على نافذة التأكيد.**
في صفحة `MyCertifications.tsx`، عند محاولة تنزيل الشهادة لأول مرة، يتم تحديد الاسم الذي سيتم طباعته على الشهادة باستخدام المنطق التالي:
```typescript
const firstName = user?.profile?.first_name || '';
const lastName = user?.profile?.last_name || '';
const currentName = [firstName, lastName].filter(Boolean).join(' ') || user?.email || 'Certificate Holder';
```
إذا لم يتم تحديث `user.profile` بشكل صحيح في حالة التطبيق (كما هو موضح في النقطة السابقة)، فإن `currentName` سيعود إلى استخدام `user.email`. وبالتالي، ستعرض نافذة التأكيد المنبثقة البريد الإلكتروني بدلاً من الاسم الكامل.

## 4. هل يتأثر منطق تنزيل الشهادة لمرة واحدة بمشكلة عرض الاسم هذه؟
**نعم، وبشكل حرج.**
بمجرد أن يوافق المستخدم على النافذة المنبثقة (حتى لو كانت تعرض البريد الإلكتروني عن طريق الخطأ أو عدم الانتباه)، يتم استدعاء دالة قاعدة البيانات `lock_certificate_holder_name`:
```typescript
const { data: lockedName, error: lockErr } = await supabase.rpc('lock_certificate_holder_name', {
  p_cert_id: cert.id,
  p_name: currentName,
});
```
كما هو موضح في ملف الهجرة `20260309000001_cert_name_lock_and_results_email.sql`، هذه الدالة تقوم بقفل الاسم بشكل دائم:
```sql
-- Lock only if not yet set (idempotent for normal users)
IF v_cert.certificate_holder_name IS NULL THEN
    UPDATE public.user_certifications
    SET certificate_holder_name = TRIM(p_name)
    WHERE id = p_cert_id;
    RETURN TRIM(p_name);
END IF;
```
بمجرد قفل الاسم (سواء كان الاسم الصحيح أو البريد الإلكتروني)، لا يمكن للمستخدم تغييره، وسيتم طباعة هذا الاسم على الشهادة في كل مرة يتم تنزيلها.

## 5. هل يعتمد تدفق إعادة الإصدار (Re-issue) على بيانات الملف الشخصي القديمة؟
**لا، تدفق إعادة الإصدار لا يحل مشكلة الاسم المقفول.**
في `certifications.service.ts`، دالة `reissueCertificate` التي يستخدمها المسؤول (Admin) تقوم فقط بمسح رابط الشهادة الحالي لإجبار النظام على إعادة إنشائها:
```typescript
const { error } = await supabase
  .from('user_certifications')
  .update({
    certificate_url: null,
    updated_at: new Date().toISOString(),
  })
  .eq('id', certificationId);
```
هذه الدالة **لا تمسح أو تُحدث** حقل `certificate_holder_name`. لذلك، حتى إذا قام المسؤول بإعادة إصدار الشهادة، سيستمر النظام في استخدام الاسم المقفول مسبقاً (والذي قد يكون البريد الإلكتروني). لتصحيح الاسم، يجب على المسؤول تعديل حقل `certificate_holder_name` مباشرة في قاعدة البيانات أو من خلال واجهة إدارة مخصصة (غير واضحة في الكود المراجع).

## الخلاصة
المشكلة الموصوفة **موجودة بالفعل** في الكود الحالي. عدم تحديث حالة `user.profile` بشكل موثوق بعد إكمال الملف الشخصي يؤدي إلى سلسلة من الأخطاء:
1. استمرار عرض البريد الإلكتروني في الواجهة.
2. استخدام البريد الإلكتروني في نافذة تأكيد الشهادة.
3. قفل البريد الإلكتروني كاسم دائم للشهادة في قاعدة البيانات عند التنزيل الأول.
4. عدم قدرة ميزة "إعادة الإصدار" الحالية على تصحيح الاسم المقفول.
