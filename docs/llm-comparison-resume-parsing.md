# LLM Model Comparison for Resume Parsing (2026)

## Executive Summary

This document compares international and Chinese domestic LLM models for resume parsing tasks, focusing on structured data extraction, multilingual support, pricing, and API availability.

## International Models

### 1. Claude (Anthropic)

**Capabilities:**
- Excellent structured output via native Tool Use with strict JSON schemas
- Strong multilingual support (English/Chinese)
- High accuracy in extracting complex nested information
- Reliable JSON formatting with schema validation

**Pricing (per 1M tokens):**
- Haiku 4.5: $1.00 input / $5.00 output
- Sonnet 4.6: $3.00 input / $15.00 output
- Opus 4.6: $5.00 input / $25.00 output

**Optimization:**
- Prompt Caching: up to 90% savings on repeated context
- Batch API: 50% discount for non-urgent processing

**Resume Parsing Suitability:** ⭐⭐⭐⭐⭐
- Best for: High-accuracy extraction, complex resume formats, multilingual resumes
- Strengths: Excellent instruction following, reliable JSON output, strong reasoning for ambiguous data

**Availability:**
- API access: Widely available globally
- Rate limits: Tiered by plan (standard to enterprise)
- Context window: Up to 200K tokens

---

### 2. GPT-4 / GPT-5 (OpenAI)

**Capabilities:**
- Native structured output via `response_format` parameter
- Strong performance on English and Chinese text
- Excellent at handling various resume formats (PDF, DOCX, plain text)
- Good at inferring missing information

**Pricing (per 1M tokens):**
- GPT-4o-mini: $0.15 input / $0.60 output
- GPT-4o: $2.50 input / $10.00 output
- GPT-5: $1.25 input / $10.00 output
- o1 (Reasoning): $15.00 input / $60.00 output

**Optimization:**
- Batch API: 50% discount
- Prompt Caching: Variable discounts by model

**Resume Parsing Suitability:** ⭐⭐⭐⭐⭐
- Best for: High-volume processing, standardized workflows
- Strengths: Fast inference, reliable structured output, good cost-performance ratio with GPT-4o-mini

**Availability:**
- API access: Global (some regional restrictions)
- Rate limits: Tiered by usage tier
- Context window: Up to 128K tokens

---

### 3. Gemini (Google)

**Capabilities:**
- Native structured output via `response_schema`
- Strong multimodal capabilities (can process resume images directly)
- Good Chinese language understanding
- Efficient Flash models for high-volume tasks

**Pricing (per 1M tokens):**
- Gemini 2.5 Flash-Lite: $0.10 input / $0.40 output
- Gemini 2.5 Flash: $0.30 input / $2.50 output
- Gemini 3 Flash: $0.50 input / $3.00 output
- Gemini 2.5 Pro: $1.25 input / $10.00 output
- Gemini 3.1 Pro: $2.00 input / $12.00 output (increases above 200K context)

**Optimization:**
- Context Caching: Significant savings for repeated prompts
- Batch API: Up to 50% discount

**Resume Parsing Suitability:** ⭐⭐⭐⭐
- Best for: Cost-sensitive high-volume processing, image-based resumes
- Strengths: Most affordable Flash models, multimodal input, good performance/cost ratio

**Availability:**
- API access: Via Google Cloud (global)
- Rate limits: Generous, scales with usage
- Context window: Up to 1M tokens (Pro models)

---

## Chinese Domestic Models

### 4. 通义千问 Qwen (Alibaba)

**Capabilities:**
- Excellent Chinese language understanding
- Strong structured output with Function Calling
- Qwen3.5 series supports long context (up to 1M tokens)
- Good at handling Chinese resume formats and terminology

**Pricing:**
- Turbo series: Often has promotional free tiers or ultra-low pricing
- Plus series: Mid-range pricing, competitive in domestic market
- Free tier: Millions of tokens for new users on Alibaba Cloud

**Estimated Cost (per 1M tokens):**
- Qwen-Turbo: ¥0.3-0.8 (~$0.04-0.11)
- Qwen-Plus: ¥4-8 (~$0.55-1.10)
- Qwen-Max: ¥20-40 (~$2.75-5.50)

**Resume Parsing Suitability:** ⭐⭐⭐⭐⭐
- Best for: Chinese resumes, integration with Alibaba ecosystem
- Strengths: Superior Chinese understanding, cost-effective, strong ecosystem support

**Availability:**
- API access: Alibaba Cloud Bailian platform
- Rate limits: Varies by tier, generally good for production
- Context window: Up to 1M tokens (Qwen3.5)

---

### 5. 文心一言 ERNIE (Baidu)

**Capabilities:**
- Deep Chinese semantic understanding
- Strong knowledge base integration (Baidu search)
- Reliable for enterprise-grade applications
- Good at handling industry-specific terminology

**Pricing:**
- Stable pricing structure across ERNIE versions
- Higher than budget models but competitive for enterprise
- ERNIE 4.5 and X1 models available

**Estimated Cost (per 1M tokens):**
- ERNIE-Speed: ¥0.4 (~$0.055)
- ERNIE-Lite: ¥0.8 (~$0.11)
- ERNIE 4.0: ¥30 input / ¥90 output (~$4.13/$12.38)

**Resume Parsing Suitability:** ⭐⭐⭐⭐
- Best for: Enterprise applications, Chinese resumes with industry jargon
- Strengths: High reliability, strong Chinese NLP, good concurrency (100 RPM)

**Availability:**
- API access: Baidu Qianfan platform
- Rate limits: 100 RPM standard, enterprise tiers available
- Context window: Up to 128K tokens

---

### 6. 智谱GLM (Zhipu AI)

**Capabilities:**
- Strong code and structured data extraction
- Good Agent/tool calling capabilities
- GLM-5 series competitive with international models
- Reliable JSON output

**Pricing:**
- Recent price increase (Feb 2026): ~30%+ across models
- Subscription plans available with discounts
- Focus on quality over price competition

**Estimated Cost (per 1M tokens):**
- GLM-4-Flash: ¥0.1 input / ¥0.1 output (~$0.014)
- GLM-4: ¥50 input / ¥50 output (~$6.88)
- GLM-5: Higher tier pricing

**Resume Parsing Suitability:** ⭐⭐⭐⭐
- Best for: Complex extraction tasks, Agent-based workflows
- Strengths: Strong reasoning, reliable structured output, good for technical resumes

**Availability:**
- API access: Zhipu AI open platform
- Rate limits: Varies by subscription tier
- Context window: Up to 128K tokens

---

### 7. 讯飞星火 Spark (iFlytek)

**Capabilities:**
- Strong Chinese language processing
- Multiple model versions (Lite, Pro, Max, Ultra)
- Good voice/multimodal capabilities
- Reliable for Chinese text understanding

**Pricing:**
- Tiered pricing by model version
- Promotional free tiers often available
- Competitive pricing in domestic market

**Estimated Cost:**
- Varies significantly by version
- Check official platform for current rates

**Resume Parsing Suitability:** ⭐⭐⭐⭐
- Best for: Chinese resumes, voice-to-text resume processing
- Strengths: Strong Chinese NLP, multimodal support

**Availability:**
- API access: iFlytek Open Platform
- Rate limits: Varies by tier
- Context window: Varies by model version

---

### 8. 百川 Baichuan

**Capabilities:**
- Multiple model tiers (Air, Standard, Plus, Turbo)
- Good Chinese language understanding
- Search-enhanced capabilities available
- Cost-effective options

**Pricing (per 1K tokens in CNY):**
- Baichuan4-Air: ¥0.00098
- Baichuan4: ¥0.1
- Baichuan-M3 Plus: ¥0.005 input / ¥0.009 output

**Resume Parsing Suitability:** ⭐⭐⭐
- Best for: Budget-conscious projects, basic extraction tasks
- Strengths: Very affordable, multiple tier options

**Availability:**
- API access: Baichuan AI platform
- Rate limits: Standard tiers available
- Context window: Varies by model

---

### 9. Moonshot (Kimi)

**Capabilities:**
- Exceptional long-context processing (up to 2M+ tokens)
- Strong for document analysis
- Good Chinese and English support
- Automatic context caching

**Pricing (per 1M tokens):**
- K2 / K2 0905: $0.60 input / $2.50 output
- K2.5 (multimodal): $0.60 input / $3.00 output
- K2 Turbo: $1.15 input / $8.00 output

**Optimization:**
- Automatic caching: 75-83% input cost reduction
- Optional web search (additional cost)

**Resume Parsing Suitability:** ⭐⭐⭐⭐⭐
- Best for: Long resumes, batch processing multiple resumes in one context
- Strengths: Exceptional long-context handling, automatic caching, cost-effective for bulk processing

**Availability:**
- API access: Moonshot platform
- Rate limits: Good for production use
- Context window: Up to 2M+ tokens

---

### 10. DeepSeek

**Capabilities:**
- Excellent cost-performance ratio
- Strong coding and reasoning abilities
- MoE architecture for efficiency
- Good structured output

**Pricing (per 1M tokens):**
- DeepSeek V3.2: $0.28 input / $0.42 output
- Cache Hit: $0.028 per 1M tokens

**Resume Parsing Suitability:** ⭐⭐⭐⭐⭐
- Best for: High-volume, cost-sensitive applications
- Strengths: Lowest cost among frontier models, good performance, excellent for batch processing

**Availability:**
- API access: DeepSeek platform
- Rate limits: Good for high-volume use
- Context window: 128K tokens

---

## Comparison Matrix

| Model | Chinese Support | JSON Output | Cost (Input/Output per 1M) | Best Use Case |
|-------|----------------|-------------|---------------------------|---------------|
| **Claude Sonnet 4.6** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $3/$15 | High-accuracy, complex formats |
| **GPT-4o** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $2.5/$10 | Balanced performance/cost |
| **GPT-4o-mini** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $0.15/$0.60 | High-volume, budget-friendly |
| **Gemini Flash** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.30/$2.50 | Cost-effective, multimodal |
| **Qwen-Plus** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$0.55/$1.10 | Chinese resumes, Alibaba ecosystem |
| **ERNIE 4.0** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$4.13/$12.38 | Enterprise Chinese applications |
| **GLM-5** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ~$6.88/$6.88 | Complex extraction, Agent workflows |
| **Moonshot K2** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.60/$2.50 | Long documents, batch processing |
| **DeepSeek V3.2** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $0.28/$0.42 | Ultra-low cost, high volume |
| **Baichuan4** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ~$0.014/$0.014 | Budget projects |

---

## Recommendations by Use Case

### 1. **High-Accuracy English/International Resumes**
**Recommended:** Claude Sonnet 4.6 or GPT-4o
- Reason: Best instruction following, reliable structured output, strong multilingual support

### 2. **High-Volume Cost-Sensitive Processing**
**Recommended:** DeepSeek V3.2 or GPT-4o-mini
- Reason: Lowest cost per token while maintaining good quality

### 3. **Chinese Resumes (Domestic Market)**
**Recommended:** Qwen-Plus or Moonshot K2
- Reason: Superior Chinese understanding, cost-effective, good ecosystem support

### 4. **Enterprise Chinese Applications**
**Recommended:** ERNIE 4.0 or GLM-5
- Reason: High reliability, strong industry terminology handling, enterprise support

### 5. **Long Resumes / Batch Processing**
**Recommended:** Moonshot K2 (with caching)
- Reason: Exceptional long-context handling, automatic caching reduces costs dramatically

### 6. **Multimodal (Image-based Resumes)**
**Recommended:** Gemini 2.5 Flash or Gemini Pro
- Reason: Native image processing, no separate OCR needed

### 7. **Complex Extraction with Validation Loop**
**Recommended:** Claude Opus 4.6 or GLM-5
- Reason: Strong reasoning for ambiguous cases, reliable error correction

---

## Implementation Best Practices

### 1. **Use Native Structured Output**
- Don't rely on prompt engineering alone
- Use API features: OpenAI's `response_format`, Claude's Tool Use, Gemini's `response_schema`
- Ensures 100% schema compliance

### 2. **Implement Validation + Repair Loop**
```
Resume → LLM Parse → JSON Output → Schema Validation
                                    ↓ (if fails)
                                Error → LLM Repair → Validated JSON
```

### 3. **Leverage Caching**
- Use prompt caching for system instructions and schema definitions
- Can reduce costs by 75-90%
- Especially effective with Moonshot, Claude, and DeepSeek

### 4. **Use Batch API for Non-Urgent Tasks**
- 50% cost savings across most providers
- Ideal for overnight processing of resume databases

### 5. **Model Selection Strategy**
- Start with cost-effective models (GPT-4o-mini, DeepSeek, Gemini Flash)
- Use premium models (Claude Opus, GPT-4o) only for complex/ambiguous cases
- Implement fallback chain: cheap model → medium model → premium model

---

## Cost Estimation Examples

### Scenario: Processing 10,000 resumes/month
**Assumptions:** Average resume = 2,000 tokens input, 800 tokens output

| Model | Monthly Cost | Notes |
|-------|-------------|-------|
| DeepSeek V3.2 | $13.92 | Most economical |
| GPT-4o-mini | $16.80 | Good balance |
| Gemini Flash | $26.00 | Multimodal capable |
| Moonshot K2 (with cache) | $30.00 | Best for long docs |
| Qwen-Plus | $33.00 | Best Chinese support |
| GPT-4o | $250.00 | Premium quality |
| Claude Sonnet 4.6 | $180.00 | High accuracy |

**With Batch API (50% discount):** Costs reduced by half for non-urgent processing

---

## Data Sources & References

### International Models:
- [Anthropic Claude Pricing](https://metacto.com)
- [OpenAI API Pricing](https://costgoat.com)
- [Google Gemini Pricing](https://blockchain-council.org)

### Chinese Models:
- [Alibaba Qwen Platform](https://aliyun.com)
- [Baidu Qianfan Platform](https://cloud.baidu.com)
- [Zhipu AI Platform](https://open.bigmodel.cn)
- [Moonshot Platform](https://platform.moonshot.cn)
- [DeepSeek Platform](https://platform.deepseek.com)
- [Baichuan AI](https://baichuan-ai.com)
- [iFlytek Spark](https://xfyun.cn)

### Industry Analysis:
- [LLM Structured Output Best Practices](https://dev.to)
- [Resume Parsing Solutions Comparison](https://airparser.com)
- [Chinese LLM Benchmarks 2026](https://juejin.cn)

---

## Important Notes

1. **Pricing Volatility:** LLM API pricing changes frequently. Always verify current rates on official platforms before implementation.

2. **Free Tiers:** Many Chinese providers offer substantial free tiers for new users (millions of tokens). Take advantage during development/testing.

3. **Regional Availability:** Some international models have restrictions in certain regions. Chinese domestic models may require local entity for enterprise accounts.

4. **Compliance:** For Chinese market applications, consider data residency requirements and prefer domestic models for sensitive data.

5. **Performance Testing:** Always benchmark multiple models with your actual resume data before committing to production deployment.

---

**Document Version:** 1.0
**Last Updated:** March 30, 2026
**Next Review:** June 2026 (quarterly updates recommended due to rapid market changes)
