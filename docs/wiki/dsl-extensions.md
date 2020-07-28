# DSL 扩展

在 C# 中使用内部 DSL 定义规则时，DSL 仅限于规则引擎提供的谓词（请参阅[流式规则 DSL](/wiki/fluent-rules-dsl.html)）。请考虑以下示例：

```csharp
[Name("Self insured name validation")]
public class SelfInsuredNameValidationRule : Rule
{
    public override void Define()
    {
        Claim claim = null;
        Patient patient = null;

        When()
            .Match<Claim>(() => claim)
            .Match<Patient>(() => patient, p => p == claim.Patient,
                p => p.RelationshipToInsured == Relationship.Self)
            .Match<Insured>(i => i == claim.Insured,
                i => !Equals(patient.Name, i.Name));

        Then()
            .Do(ctx => ctx.Warning(claim, "Self insured name does not match"));
    }
}

public static class ContextExtensions
{
    public static void Warning(this IContext context, Claim claim, string message)
    {
        var warning = new ClaimAlert { Severity = 2, Claim = claim, RuleName = context.Rule.Name, Message = message };
        context.Insert(warning);
    }        
}
```

此规则与自保患者的索赔相匹配，并确保患者和被保险人的姓名匹配。如果名称不匹配，则将创建一个警告级别声明警报。

如果我们可以类似这样方式写它，那么规则看起来会更具可读性：

```csharp
[Name("Self insured name validation")]
public class SelfInsuredNameValidationRule : Rule
{
    public override void Define()
    {
        Claim claim = null;
        Patient patient = null;

        When()
            .Claim(() => claim)
            .Patient(() => patient, p => p == claim.Patient, 
                p => p.RelationshipToInsured == Relationship.Self)
            .Insured(i => i == claim.Insured, 
                i => !Equals(patient.Name, i.Name));

        Then()
            .Warning(claim, "Self insured name does not match");
    }
}
```

好消息是，通过定义类似这样的 DSL 扩展方法，可以做到这一点：

```csharp
public static class DslExtensions
{
    public static ILeftHandSideExpression Claim(this ILeftHandSideExpression lhs, Expression<Func<Claim>> alias, params Expression<Func<Claim, bool>>[] conditions)
    {
        return lhs.Match(alias, conditions);
    }

    public static ILeftHandSideExpression Patient(this ILeftHandSideExpression lhs, Expression<Func<Patient>> alias, params Expression<Func<Patient, bool>>[] conditions)
    {
        return lhs.Match(alias, conditions);
    }

    public static ILeftHandSideExpression Insured(this ILeftHandSideExpression lhs, params Expression<Func<Insured, bool>>[] conditions)
    {
        return lhs.Match(conditions);
    }

    public static IRightHandSideExpression Warning(this IRightHandSideExpression rhs, Claim claim, string message)
    {
        return rhs.Do(ctx => ctx.Warning(claim, message));
    }
}
```