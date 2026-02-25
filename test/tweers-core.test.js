import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const corePath = require.resolve('tweers-core')

let sort_paths, parse, passages, build, build_from_parsed

beforeAll(async () => {
  const mod = await import('tweers-core')
  const wasmPath = corePath.replace('tweers_core.js', 'tweers_core_bg.wasm')
  const wasmBytes = readFileSync(wasmPath)
  mod.initSync({ module: wasmBytes })
  mod.init_panic_hook()

  sort_paths = mod.sort_paths
  parse = mod.parse
  passages = mod.passages
  build = mod.build
  build_from_parsed = mod.build_from_parsed
})

// ============ Helpers ============

const STORY_DATA_TWEE = `:: StoryData
{
  "ifid": "D674C58C-DEFA-4F70-B7A2-27742230C0FC",
  "format": "Harlowe",
  "format-version": "3.3.9"
}

:: StoryTitle
测试故事

`

function makeSource(name, content) {
  return { type: 'text', name, content }
}

const MINIMAL_FORMAT_SOURCE = `window.storyFormat({"name":"Harlowe","version":"3.3.9","source":"<html><head></head><body><tw-storydata name=\\"{{STORY_NAME}}\\" startnode=\\"{{START_NODE}}\\" creator=\\"tweers\\" ifid=\\"{{IFID}}\\">{{STORY_DATA}}</tw-storydata></body></html>"})`

// ============ sort_paths ============

describe('sort_paths', () => {
  it('应该返回空数组当输入为空', () => {
    expect(sort_paths([])).toEqual([])
  })

  it('应该按深度优先排序（更深的路径在前）', () => {
    const input = ['a.tw', 'dir/b.tw', 'dir/sub/c.tw']
    const result = sort_paths(input)
    expect(result[0]).toBe('dir/sub/c.tw')
    expect(result[result.length - 1]).toBe('a.tw')
  })

  it('同深度下应该自然排序', () => {
    const input = ['z.tw', 'a.tw', 'm.tw']
    const result = sort_paths(input)
    expect(result).toEqual(['a.tw', 'm.tw', 'z.tw'])
  })

  it('应该正确处理单个路径', () => {
    expect(sort_paths(['only.tw'])).toEqual(['only.tw'])
  })
})

// ============ passages ============

describe('passages', () => {
  it('应该解析单个段落', () => {
    const src = `:: Hello\n你好世界\n`
    const result = passages([makeSource('test.tw', src)])
    expect(result).toBeInstanceOf(Map)
    expect(result.has('Hello')).toBe(true)
    expect(result.get('Hello').content.trim()).toBe('你好世界')
  })

  it('应该解析多个段落', () => {
    const src = `:: First\n内容一\n\n:: Second\n内容二\n`
    const result = passages([makeSource('test.tw', src)])
    expect(result.size).toBe(2)
    expect(result.has('First')).toBe(true)
    expect(result.has('Second')).toBe(true)
  })

  it('应该解析带标签的段落', () => {
    const src = `:: Tagged [mytag special]\n带标签的内容\n`
    const result = passages([makeSource('test.tw', src)])
    const p = result.get('Tagged')
    expect(p).toBeDefined()
    expect(p.tags).toContain('mytag')
    expect(p.tags).toContain('special')
  })

  it('应该跨多个源文件解析段落', () => {
    const src1 = `:: FromFile1\n内容1\n`
    const src2 = `:: FromFile2\n内容2\n`
    const result = passages([
      makeSource('a.tw', src1),
      makeSource('b.tw', src2),
    ])
    expect(result.has('FromFile1')).toBe(true)
    expect(result.has('FromFile2')).toBe(true)
  })
})

// ============ parse ============

describe('parse', () => {
  it('应该解析包含 StoryData 的源文件', () => {
    const src = STORY_DATA_TWEE + `:: Start\n开始段落\n`
    const result = parse([makeSource('story.tw', src)])
    expect(result).toHaveProperty('passages')
    expect(result).toHaveProperty('story_data')
    expect(result).toHaveProperty('format_info')
  })

  it('应该正确提取 story_data 字段', () => {
    const src = STORY_DATA_TWEE + `:: Start\n内容\n`
    const result = parse([makeSource('story.tw', src)])
    expect(result.story_data.ifid).toBe('D674C58C-DEFA-4F70-B7A2-27742230C0FC')
    expect(result.story_data.format).toBe('Harlowe')
    expect(result.story_data['format-version']).toBe('3.3.9')
  })

  it('应该包含段落数据', () => {
    const src = STORY_DATA_TWEE + `:: MyPassage\n段落内容\n`
    const result = parse([makeSource('story.tw', src)])
    expect(result.passages).toBeInstanceOf(Map)
    expect(result.passages.has('MyPassage')).toBe(true)
    expect(result.passages.get('MyPassage').content.trim()).toBe('段落内容')
  })

  it('无 StoryData 时应该抛出错误', () => {
    const src = `:: Start\n没有 StoryData\n`
    expect(() => parse([makeSource('story.tw', src)])).toThrow()
  })
})

// ============ build ============

describe('build', () => {
  it('应该从配置构建 HTML', () => {
    const src = STORY_DATA_TWEE + `:: Start\n你好\n`
    const config = {
      sources: [makeSource('story.tw', src)],
      format_info: {
        name: 'Harlowe',
        version: '3.3.9',
        source: MINIMAL_FORMAT_SOURCE,
      },
    }
    const result = build(config)
    expect(result).toBeDefined()
    expect(typeof result.html).toBe('string')
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('构建输出应该包含段落内容', () => {
    const src = STORY_DATA_TWEE + `:: Start\n测试内容123\n`
    const config = {
      sources: [makeSource('story.tw', src)],
      format_info: {
        name: 'Harlowe',
        version: '3.3.9',
        source: MINIMAL_FORMAT_SOURCE,
      },
    }
    const result = build(config)
    expect(result.html).toContain('测试内容123')
  })

  it('缺少 format_info.source 时应该抛出错误', () => {
    const src = STORY_DATA_TWEE + `:: Start\n内容\n`
    const config = {
      sources: [makeSource('story.tw', src)],
    }
    expect(() => build(config)).toThrow()
  })
})

// ============ build_from_parsed ============

describe('build_from_parsed', () => {
  it('应该从已解析的数据构建 HTML', () => {
    const src = STORY_DATA_TWEE + `:: Start\n从解析构建\n`
    const parsed = parse([makeSource('story.tw', src)])
    parsed.format_info.source = MINIMAL_FORMAT_SOURCE
    const result = build_from_parsed(parsed)
    expect(typeof result.html).toBe('string')
    expect(result.html.length).toBeGreaterThan(0)
  })

  it('构建结果应该包含段落内容', () => {
    const src = STORY_DATA_TWEE + `:: Start\n特殊内容ABC\n`
    const parsed = parse([makeSource('story.tw', src)])
    parsed.format_info.source = MINIMAL_FORMAT_SOURCE
    const result = build_from_parsed(parsed)
    expect(result.html).toContain('特殊内容ABC')
  })

  it('format_info.source 为空时应该抛出错误', () => {
    const src = STORY_DATA_TWEE + `:: Start\n内容\n`
    const parsed = parse([makeSource('story.tw', src)])
    expect(() => build_from_parsed(parsed)).toThrow()
  })
})