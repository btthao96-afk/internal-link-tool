# Input Schema

## Required fields

| Field | Type | Mô tả |
|-------|------|-------|
| `source` | string | URL nguồn (đầy đủ hoặc tương đối) |
| `target` | string | URL đích |
| `anchor` | string | Anchor text |

## Optional fields (skill dùng nếu có)

| Field | Type | Default | Tác dụng |
|-------|------|---------|---------|
| `anchor_type` | string | `unknown` | Phân loại exact/partial/branded/generic/long-tail |
| `cluster` | string | `n/a` | Nhãn cụm chủ đề (dùng cho cluster_distribution) |
| `same_cluster` | bool | `false` | Source và target có cùng cluster không |
| `position` | string | `body` | intro/body/outro (chỉ hiển thị) |
| `semantic_score` | float | `0` | Điểm liên quan ngữ nghĩa |

## Format JSON
```json
[
  {
    "source": "https://example.com/a",
    "target": "https://example.com/b",
    "anchor": "click here",
    "anchor_type": "generic",
    "cluster": "iphone-18-camera",
    "same_cluster": true
  }
]
```

## Format CSV
```csv
source,target,anchor,anchor_type,cluster,same_cluster
https://example.com/a,https://example.com/b,click here,generic,iphone-18-camera,true
```
